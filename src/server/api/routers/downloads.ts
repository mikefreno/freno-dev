import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";

const assets: Record<string, string> = {
  gaze: "Gaze.dmg",
  lineage: "Life and Lineage.apk",
  cork: "Cork.zip",
  "shapes-with-abigail": "shapes-with-abigail.apk"
};

export const downloadsRouter = createTRPCRouter({
  getDownloadUrl: publicProcedure
    .input(z.object({ asset_name: z.string() }))
    .query(async ({ input }) => {
      const bucket = env.VITE_DOWNLOAD_BUCKET_STRING;
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
    })
});
