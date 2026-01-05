import { createTRPCRouter, publicProcedure } from "../utils";
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
import * as bcrypt from "bcrypt";
import { getCookie, setCookie } from "vinxi/http";
import {
  fetchWithTimeout,
  checkResponse,
  fetchWithRetry,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";
import { NETWORK_CONFIG, COOLDOWN_TIMERS, VALIDATION_CONFIG } from "~/config";
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
        accessKeyId: env._AWS_ACCESS_KEY,
        secretAccessKey: env._AWS_SECRET_KEY
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

  getPreSignedURL: publicProcedure
    .input(
      z.object({
        type: z.string(),
        title: z.string(),
        filename: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const credentials = {
        accessKeyId: env._AWS_ACCESS_KEY,
        secretAccessKey: env._AWS_SECRET_KEY
      };

      try {
        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const sanitizeForS3 = (str: string) => {
          return str
            .replace(/\s+/g, "-")
            .replace(/[^\w\-\.]/g, "")
            .replace(/\-+/g, "-")
            .replace(/^-+|-+$/g, "");
        };

        const sanitizedTitle = sanitizeForS3(input.title);
        const sanitizedFilename = sanitizeForS3(input.filename);
        const Key = `${input.type}/${sanitizedTitle}/${sanitizedFilename}`;

        const ext = /^.+\.([^.]+)$/.exec(input.filename);

        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key,
          ContentType: `image/${ext![1]}`
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

  listAttachments: publicProcedure
    .input(
      z.object({
        type: z.string(),
        title: z.string()
      })
    )
    .query(async ({ input }) => {
      try {
        const credentials = {
          accessKeyId: env._AWS_ACCESS_KEY,
          secretAccessKey: env._AWS_SECRET_KEY
        };

        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials
        });

        const sanitizeForS3 = (str: string) => {
          return str
            .replace(/\s+/g, "-")
            .replace(/[^\w\-\.]/g, "")
            .replace(/\-+/g, "-")
            .replace(/^-+|-+$/g, "");
        };

        const sanitizedTitle = sanitizeForS3(input.title);
        const prefix = `${input.type}/${sanitizedTitle}/`;

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

  deleteImage: publicProcedure
    .input(
      z.object({
        key: z.string(),
        newAttachmentString: z.string(),
        type: z.string(),
        id: z.number()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const credentials = {
          accessKeyId: env._AWS_ACCESS_KEY,
          secretAccessKey: env._AWS_SECRET_KEY
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

  simpleDeleteImage: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const credentials = {
          accessKeyId: env._AWS_ACCESS_KEY,
          secretAccessKey: env._AWS_SECRET_KEY
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

  hashPassword: publicProcedure
    .input(z.object({ password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      try {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(input.password, salt);
        return { hashedPassword };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to hash password"
        });
      }
    }),

  checkPassword: publicProcedure
    .input(
      z.object({
        password: z.string(),
        hash: z.string()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const match = await bcrypt.compare(input.password, input.hash);
        return { match };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check password"
        });
      }
    }),

  sendContactRequest: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        message: z
          .string()
          .min(1)
          .max(VALIDATION_CONFIG.MAX_CONTACT_MESSAGE_LENGTH)
      })
    )
    .mutation(async ({ input }) => {
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

      const sendinblueData = {
        sender: {
          name: "freno.me",
          email: "michael@freno.me"
        },
        to: [{ email: "michael@freno.me" }],
        htmlContent: `<html><head></head><body><div>Request Name: ${input.name}</div><div>Request Email: ${input.email}</div><div>Request Message: ${input.message}</div></body></html>`,
        subject: "freno.me Contact Request"
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

  sendDeletionRequestEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const deletionExp = getCookie("deletionRequestSent");
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
        htmlContent: `<html><head></head><body><div>Request Name: Life and Lineage Account Deletion</div><div>Request Email: ${input.email}</div></body></html>`,
        subject: "Life and Lineage Acct Deletion"
      };

      const sendinblueUserData = {
        sender: {
          name: "freno.me",
          email: "michael@freno.me"
        },
        to: [{ email: input.email }],
        htmlContent: `<html><head></head><body><div>Request Name: Life and Lineage Account Deletion</div><div>Account to delete: ${input.email}</div><div>You can email michael@freno.me in the next 24hrs to cancel the deletion, email with subject line "Account Deletion Cancellation"</div></body></html>`,
        subject: "Life and Lineage Acct Deletion"
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
        setCookie("deletionRequestSent", exp.toUTCString(), {
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
