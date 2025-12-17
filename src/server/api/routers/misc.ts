import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";
import { ConnectionFactory } from "~/server/utils";
import * as bcrypt from "bcrypt";

const assets: Record<string, string> = {
  "shapes-with-abigail": "shapes-with-abigail.apk",
  "magic-delve": "magic-delve.apk",
  cork: "Cork.zip",
};

export const miscRouter = createTRPCRouter({
  // ============================================================
  // Downloads endpoint
  // ============================================================
  
  getDownloadUrl: publicProcedure
    .input(z.object({ asset_name: z.string() }))
    .query(async ({ input }) => {
      const bucket = "frenomedownloads";
      const params = {
        Bucket: bucket,
        Key: assets[input.asset_name],
      };
      
      if (!assets[input.asset_name]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      const credentials = {
        accessKeyId: env._AWS_ACCESS_KEY,
        secretAccessKey: env._AWS_SECRET_KEY,
      };

      try {
        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials,
        });

        const command = new GetObjectCommand(params);
        const signedUrl = await getSignedUrl(client, command, { expiresIn: 120 });
        return { downloadURL: signedUrl };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL",
        });
      }
    }),

  // ============================================================
  // S3 Operations
  // ============================================================

  getPreSignedURL: publicProcedure
    .input(z.object({
      type: z.string(),
      title: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const credentials = {
        accessKeyId: env._AWS_ACCESS_KEY,
        secretAccessKey: env._AWS_SECRET_KEY,
      };

      try {
        const client = new S3Client({
          region: env.AWS_REGION,
          credentials: credentials,
        });

        const Key = `${input.type}/${input.title}/${input.filename}`;
        const ext = /^.+\.([^.]+)$/.exec(input.filename);

        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key,
          ContentType: `image/${ext![1]}`,
        };

        const command = new PutObjectCommand(s3params);
        const signedUrl = await getSignedUrl(client, command, { expiresIn: 120 });
        
        return { uploadURL: signedUrl, key: Key };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate pre-signed URL",
        });
      }
    }),

  deleteImage: publicProcedure
    .input(z.object({
      key: z.string(),
      newAttachmentString: z.string(),
      type: z.string(),
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: input.key,
        };

        const client = new S3Client({
          region: env.AWS_REGION,
        });

        const command = new DeleteObjectCommand(s3params);
        const res = await client.send(command);

        const conn = ConnectionFactory();
        const query = `UPDATE ${input.type} SET attachments = ? WHERE id = ?`;
        await conn.execute({
          sql: query,
          args: [input.newAttachmentString, input.id],
        });

        return res;
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image",
        });
      }
    }),

  simpleDeleteImage: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const s3params = {
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: input.key,
        };

        const client = new S3Client({
          region: env.AWS_REGION,
        });

        const command = new DeleteObjectCommand(s3params);
        const res = await client.send(command);
        
        return res;
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete image",
        });
      }
    }),

  // ============================================================
  // Password Hashing
  // ============================================================

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
          message: "Failed to hash password",
        });
      }
    }),

  checkPassword: publicProcedure
    .input(z.object({
      password: z.string(),
      hash: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const match = await bcrypt.compare(input.password, input.hash);
        return { match };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check password",
        });
      }
    }),
});
