import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env/server";
import { TRPCError } from "@trpc/server";

const assets: Record<string, string> = {
  lineage: "Life and Lineage.apk",
  cork: "Cork.zip",
  "shapes-with-abigail": "shapes-with-abigail.apk"
};

/**
 * Find the most recent file in S3 matching a prefix and extension.
 */
async function getLatestFile(
  client: S3Client,
  bucket: string,
  prefix: string,
  ext: string
): Promise<string> {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 100
    });

    const response = await client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      throw new Error(`No files found in S3 with prefix ${prefix}`);
    }

    const files = response.Contents.filter((obj) =>
      obj.Key?.endsWith(ext)
    ).sort((a, b) => {
      const dateA = a.LastModified?.getTime() || 0;
      const dateB = b.LastModified?.getTime() || 0;
      return dateB - dateA;
    });

    if (files.length === 0) {
      throw new Error(`No ${ext} files found in ${prefix} prefix`);
    }

    const latestFile = files[0].Key!;
    console.log(`Latest file: ${latestFile}`);
    return latestFile;
  } catch (error) {
    console.error(`Error finding latest file for ${prefix}:`, error);
    throw error;
  }
}

/**
 * Per-asset S3 lookup config for macOS apps that auto-resolve latest version.
 */
const latestAssets: Record<
  string,
  { prefix: string; ext: string }
> = {
  gaze: { prefix: "downloads/Gaze-", ext: ".dmg" },
  inputhalo: { prefix: "downloads/InputHalo-", ext: ".dmg" },
  thenook: { prefix: "downloads/TheNook-", ext: ".zip" }
};

export const downloadsRouter = createTRPCRouter({
  getDownloadUrl: publicProcedure
    .input(z.object({ asset_name: z.string() }))
    .query(async ({ input }) => {
      const bucket = env.VITE_DOWNLOAD_BUCKET_STRING;

      const credentials = {
        accessKeyId: env.MY_AWS_ACCESS_KEY,
        secretAccessKey: env.MY_AWS_SECRET_KEY
      };

      const client = new S3Client({
        region: env.AWS_REGION,
        credentials: credentials
      });

      try {
        let fileKey: string;

        const latest = latestAssets[input.asset_name];
        if (latest) {
          fileKey = await getLatestFile(client, bucket, latest.prefix, latest.ext);
        } else {
          fileKey = assets[input.asset_name];

          if (!fileKey) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Asset not found"
            });
          }
        }

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: fileKey
        });

        const signedUrl = await getSignedUrl(client, command, {
          expiresIn: 120
        });

        return { downloadURL: signedUrl };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate download URL"
        });
      }
    })
});
