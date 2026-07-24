import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  csrfProtectedProcedure
} from "../utils";
import { z } from "zod";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";
import { ConnectionFactory } from "~/server/utils";
import { getCookie, setCookie } from "vinxi/http";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError,
  verifyTurnstileToken
} from "~/server/fetch-utils";
import {
  NETWORK_CONFIG,
  COOLDOWN_TIMERS,
  VALIDATION_CONFIG,
  TURNSTILE_CONFIG
} from "~/config";
import {
  CONTACT_RECIPIENT_EMAIL,
  CONTACT_SENDER,
  buildContactSubject
} from "~/lib/contact-config";

// Allowed S3 key types — prevents path traversal via type parameter (p8-008)
const ALLOWED_S3_TYPES = ["blog", "attachments", "avatars", "users"] as const;
export const s3TypeSchema = z.enum(ALLOWED_S3_TYPES);

/** Sanitize a user-provided string for use in S3 key path components */
export function sanitizeS3PathComponent(value: string): string {
  // Strip path traversal characters and normalize whitespace
  return value
    .replace(/\s+/g, "-")
    .replace(/[/\\]/g, "-")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);
}

/** Verify that the S3 key belongs to the authenticated user.
 * Exported for direct regression testing (p8-001/p8-008). */
export function assertS3KeyOwnership(key: string, userId: string | null): void {
  // Keys should be scoped by user ID: attachments/{userId}/... or avatars/{userId}/...
  const parts = key.split("/");
  if (!userId || parts.length < 2 || parts[1] !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied: S3 object does not belong to user"
    });
  }
}

// ============================================================
// Account-deletion request email — product-aware
// ============================================================
//
// Pure helpers live in `./deletion-email.ts` (env-free) so they can be unit-
// tested in `bun:test` without a populated `.env`. Re-exported here for the
// tRPC mutation below + for callers that already import from `misc`.
// Import into local scope FIRST — `sendDeletionRequestEmail` below uses
// these names directly. A bare `export { ... } from` re-export does NOT make
// the bindings available locally, which caused a ReferenceError that crashed
// the entire tRPC router (503 on every /api/trpc call).
import {
  DELETION_PRODUCT_SCHEMA,
  deletionCookieName,
  deletionEmailContent
} from "./deletion-email";
export { DELETION_PRODUCT_SCHEMA, deletionCookieName, deletionEmailContent };
export type { DeletionProduct, DeletionEmailContent } from "./deletion-email";

const assets: Record<string, string> = {
  "shapes-with-abigail": "shapes-with-abigail.apk",
  "magic-delve": "magic-delve.apk",
  cork: "Cork.zip"
};

export const miscRouter = createTRPCRouter({
  getDownloadUrl: publicProcedure
    .input(z.object({ asset_name: z.string() }))
    .query(async ({ input }) => {
      const bucket = "frenomedownloads";
      const params = {
        Bucket: bucket,
        Key: assets[input.asset_name]
      };

      if (!assets[input.asset_name]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found"
        });
      }

      const credentials = {
        accessKeyId: env.MY_AWS_ACCESS_KEY,
        secretAccessKey: env.MY_AWS_SECRET_KEY
      };

      try {
        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const command = new GetObjectCommand(params);
        const signedUrl = await getSignedUrl(client, command, {
          expiresIn: 120
        });
        return { downloadURL: signedUrl };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL"
        });
      }
    }),

  getPreSignedURL: csrfProtectedProcedure
    .input(
      z.object({
        type: s3TypeSchema,
        title: z.string().min(1).max(255),
        filename: z.string().min(1).max(255)
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate type is in allowlist (done by zod schema)
      const validatedType = input.type;

      // Sanitize title and filename for S3 key construction (p8-008)
      const sanitizedTitle = sanitizeS3PathComponent(input.title);
      const sanitizedFilename = sanitizeS3PathComponent(input.filename);

      if (!sanitizedTitle || !sanitizedFilename) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid title or filename after sanitization"
        });
      }

      // Construct S3 key with user ID for ownership scoping (p8-001)
      const Key = `${validatedType}/${ctx.userId}/${sanitizedTitle}/${sanitizedFilename}`;

      const ext = /^.+\.([^.]+)$/.exec(input.filename);
      if (!ext) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid filename: must include an extension"
        });
      }

      const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      if (!validExtensions.includes(ext[1].toLowerCase())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file extension"
        });
      }

      const credentials = {
        accessKeyId: env.MY_AWS_ACCESS_KEY,
        secretAccessKey: env.MY_AWS_SECRET_KEY
      };

      try {
        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key,
          ContentType: `image/${ext[1]}`
        };

        const command = new PutObjectCommand(s3params);
        const signedUrl = await getSignedUrl(client, command, {
          expiresIn: 120
        });

        return { uploadURL: signedUrl, key: Key };
      } catch (error) {
        console.error("Failed to generate pre-signed URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate pre-signed URL"
        });
      }
    }),

  listAttachments: protectedProcedure
    .input(
      z.object({
        type: s3TypeSchema,
        title: z.string().min(1).max(255)
      })
    )
    .query(async ({ input, ctx }) => {
      // Validate type is in allowlist (done by zod schema)
      const validatedType = input.type;

      // Sanitize title for S3 key construction (p8-008)
      const sanitizedTitle = sanitizeS3PathComponent(input.title);
      if (!sanitizedTitle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid title after sanitization"
        });
      }

      // Scope prefix to authenticated user (p8-001)
      const prefix = `${validatedType}/${ctx.userId}/${sanitizedTitle}/`;

      try {
        const credentials = {
          accessKeyId: env.MY_AWS_ACCESS_KEY,
          secretAccessKey: env.MY_AWS_SECRET_KEY
        };

        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const command = new ListObjectsV2Command({
          Bucket: env.AWS_S3_BUCKET_NAME,
          Prefix: prefix
        });

        const response = await client.send(command);
        const files =
          response.Contents?.map((item) => ({
            key: item.Key || "",
            size: item.Size || 0,
            lastModified: item.LastModified?.toISOString() || ""
          })) || [];

        // Filter out thumbnail files (ending with -small.ext)
        const mainFiles = files.filter(
          (file) => !file.key.match(/-small\.(jpg|jpeg|png|gif)$/i)
        );

        return { files: mainFiles };
      } catch (error) {
        console.error("Failed to list attachments:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list attachments"
        });
      }
    }),

  deleteImage: csrfProtectedProcedure
    .input(
      z.object({
        key: z.string(),
        newAttachmentString: z.string(),
        type: z.enum(["Post", "Comment", "User"]),
        id: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify S3 key ownership (p8-001)
      assertS3KeyOwnership(input.key, ctx.userId);

      try {
        const credentials = {
          accessKeyId: env.MY_AWS_ACCESS_KEY,
          secretAccessKey: env.MY_AWS_SECRET_KEY
        };

        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: input.key
        };

        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const command = new DeleteObjectCommand(s3params);
        const res = await client.send(command);

        const conn = ConnectionFactory();
        // input.type is validated by z.enum allowlist above — safe for identifier use
        const query = `UPDATE ${input.type} SET attachments = ? WHERE id = ?`;
        await conn.execute({
          sql: query,
          args: [input.newAttachmentString, input.id]
        });

        return res;
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image"
        });
      }
    }),

  simpleDeleteImage: csrfProtectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Verify S3 key ownership (p8-001)
      assertS3KeyOwnership(input.key, ctx.userId);

      try {
        const credentials = {
          accessKeyId: env.MY_AWS_ACCESS_KEY,
          secretAccessKey: env.MY_AWS_SECRET_KEY
        };

        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: input.key
        };

        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const command = new DeleteObjectCommand(s3params);
        const res = await client.send(command);

        return res;
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image"
        });
      }
    }),

  sendContactRequest: csrfProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        message: z
          .string()
          .min(1)
          .max(VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH),
        turnstileToken: z.string().min(1, "Please complete the security check"),
        /**
         * Per-site subject prefix injected into the outbound email subject
         * Defaults to `"freno.me"` so existing callers
         * main-site contact form) keep emitting the byte-identical legacy
         * subject `"freno.me Contact Request"`.
         */
        subjectPrefix: z.string().min(1).max(50).optional().default("freno.me")
      })
    )
    .mutation(async ({ input }) => {
      // Verify Cloudflare Turnstile token
      const turnstileValid = await verifyTurnstileToken(
        input.turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        TURNSTILE_CONFIG.VERIFY_URL,
        TURNSTILE_CONFIG.RESPONSE_TIMEOUT_MS
      );

      if (!turnstileValid) {
        console.error(
          "Turnstile verification failed for contact form submission"
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Security verification failed. Please refresh the page and try again."
        });
      }

      const contactExp = getCookie("contactRequestSent");
      let remaining = 0;

      if (contactExp) {
        const expires = new Date(contactExp);
        remaining = expires.getTime() - Date.now();
      }

      if (remaining > 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "countdown not expired"
        });
      }

      const apiKey = env.SENDINBLUE_KEY;
      const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

      // HTML-escape user input to prevent HTML injection in email (p8-006)
      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const subject = buildContactSubject(input.subjectPrefix);
      const sendinblueData = {
        sender: { ...CONTACT_SENDER },
        to: [{ email: CONTACT_RECIPIENT_EMAIL }],
        htmlContent: `<html><head></head><body><div>Source: ${escapeHtml(input.subjectPrefix)}</div><div>Request Name: ${escapeHtml(input.name)}</div><div>Request Email: ${escapeHtml(input.email)}</div><div>Request Message: ${escapeHtml(input.message)}</div></body></html>`,
        subject
      };

      try {
        await fetchWithRetry(
          async () => {
            const response = await fetchWithTimeout(apiUrl, {
              method: "POST",
              headers: {
                accept: "application/json",
                "api-key": apiKey,
                "content-type": "application/json"
              },
              body: JSON.stringify(sendinblueData),
              timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
            });

            await checkResponse(response);
            return response;
          },
          {
            maxRetries: NETWORK_CONFIG.MAX_RETRIES,
            retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
          }
        );

        const exp = new Date(Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS);
        setCookie("contactRequestSent", exp.toUTCString(), {
          expires: exp,
          path: "/"
        });

        return { message: "email sent" };
      } catch (error) {
        if (error instanceof TimeoutError) {
          console.error("Contact form email timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message:
              "Email service timed out. Please try again or contact michael@freno.me"
          });
        } else if (error instanceof NetworkError) {
          console.error("Contact form network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Network error. Please try again or contact michael@freno.me"
          });
        } else if (error instanceof APIError) {
          console.error(
            "Contact form API error:",
            error.status,
            error.statusText
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Email service error. You can reach me at michael@freno.me"
          });
        }

        console.error("Contact form error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Sorry! You can reach me at michael@freno.me"
        });
      }
    }),

  sendDeletionRequestEmail: csrfProtectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        /** Product discriminator — defaults to "lineage" for backward compat. */
        product: DELETION_PRODUCT_SCHEMA.default("lineage")
      })
    )
    .mutation(async ({ input }) => {
      const cookieName = deletionCookieName(input.product);
      const { subject, operatorHtml, userHtml } = deletionEmailContent(
        input.product,
        input.email
      );

      const deletionExp = getCookie(cookieName);
      let remaining = 0;

      if (deletionExp) {
        const expires = new Date(deletionExp);
        remaining = expires.getTime() - Date.now();
      }

      if (remaining > 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "countdown not expired"
        });
      }

      const apiKey = env.SENDINBLUE_KEY;
      const apiUrl = "https://api.sendinblue.com/v3/smtp/email";

      const sendinblueMyData = {
        sender: {
          name: "freno.me",
          email: "michael@freno.me"
        },
        to: [{ email: "michael@freno.me" }],
        htmlContent: operatorHtml,
        subject
      };

      const sendinblueUserData = {
        sender: {
          name: "freno.me",
          email: "michael@freno.me"
        },
        to: [{ email: input.email }],
        htmlContent: userHtml,
        subject
      };

      try {
        await Promise.all([
          fetchWithRetry(
            async () => {
              const response = await fetchWithTimeout(apiUrl, {
                method: "POST",
                headers: {
                  accept: "application/json",
                  "api-key": apiKey,
                  "content-type": "application/json"
                },
                body: JSON.stringify(sendinblueMyData),
                timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
              });
              await checkResponse(response);
              return response;
            },
            {
              maxRetries: NETWORK_CONFIG.MAX_RETRIES,
              retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
            }
          ),
          fetchWithRetry(
            async () => {
              const response = await fetchWithTimeout(apiUrl, {
                method: "POST",
                headers: {
                  accept: "application/json",
                  "api-key": apiKey,
                  "content-type": "application/json"
                },
                body: JSON.stringify(sendinblueUserData),
                timeout: NETWORK_CONFIG.EMAIL_API_TIMEOUT_MS
              });
              await checkResponse(response);
              return response;
            },
            {
              maxRetries: NETWORK_CONFIG.MAX_RETRIES,
              retryDelay: NETWORK_CONFIG.RETRY_DELAY_MS
            }
          )
        ]);

        const exp = new Date(Date.now() + COOLDOWN_TIMERS.CONTACT_REQUEST_MS);
        setCookie(cookieName, exp.toUTCString(), {
          expires: exp,
          path: "/"
        });

        return { message: "request sent" };
      } catch (error) {
        if (error instanceof TimeoutError) {
          console.error("Deletion request email timeout:", error.message);
          throw new TRPCError({
            code: "TIMEOUT",
            message: "Email service timed out. Please try again."
          });
        } else if (error instanceof NetworkError) {
          console.error("Deletion request network error:", error.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Network error. Please try again later."
          });
        } else if (error instanceof APIError) {
          console.error(
            "Deletion request API error:",
            error.status,
            error.statusText
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Email service error. Please try again later."
          });
        }

        console.error("Deletion request error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send deletion request. Please try again."
        });
      }
    })
});
