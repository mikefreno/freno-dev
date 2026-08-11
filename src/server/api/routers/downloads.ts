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
 * Get the latest DMG from S3 by finding the most recent file with the given prefix
 */
async function getLatestDMG(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<string> {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 100
    });

    const response = await client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      throw new Error(`No DMG files found in S3 with prefix ${prefix}`);
    }

    const dmgFiles = response.Contents.filter((obj) =>
      obj.Key?.endsWith(".dmg")
    ).sort((a, b) => {
      const dateA = a.LastModified?.getTime() || 0;
      const dateB = b.LastModified?.getTime() || 0;
      return dateB - dateA; // Descending order (newest first)
    });

    if (dmgFiles.length === 0) {
      throw new Error(`No .dmg files found in ${prefix} prefix`);
    }

    const latestFile = dmgFiles[0].Key!;
    console.log(`Latest DMG: ${latestFile}`);
    return latestFile;
  } catch (error) {
    console.error(`Error finding latest DMG for ${prefix}:`, error);
    throw error;
  }
}

/**
 * Get the latest Gaze DMG from S3
 */
async function getLatestGazeDMG(
  client: S3Client,
  bucket: string
): Promise<string> {
  return getLatestDMG(client, bucket, "downloads/Gaze-");
}

/**
 * Get the latest InputHalo DMG from S3
 */
async function getLatestInputHaloDMG(
  client: S3Client,
  bucket: string
): Promise<string> {
  return getLatestDMG(client, bucket, "downloads/InputHalo-");
}

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

        // Special handling for macOS apps - find latest version automatically
        if (input.asset_name === "gaze") {
          fileKey = await getLatestGazeDMG(client, bucket);
        } else if (input.asset_name === "inputhalo") {
          fileKey = await getLatestInputHaloDMG(client, bucket);
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
