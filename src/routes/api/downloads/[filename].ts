import type { APIEvent } from "@solidjs/start/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env/server";

/**
 * Serves macOS app DMG files and delta updates from S3
 * This endpoint is used by Sparkle updater to download updates
 *
 * Handles:
 * - Full DMG files: /api/downloads/Gaze-0.2.2.dmg, /api/downloads/InputHalo-0.1.0.dmg
 * - Delta updates: /api/downloads/Gaze3-2.delta, /api/downloads/InputHalo3-2.delta
 *
 * URL: https://freno.me/api/downloads/[filename]
 */
export async function GET(event: APIEvent) {
  const filename = event.params.filename;

  if (!filename) {
    return new Response("Filename required", {
      status: 400,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }

  // Validate filename format (only allow Gaze or InputHalo files)
  const validPrefixes = ["Gaze", "InputHalo"];
  const isValidPrefix = validPrefixes.some((prefix) => filename.startsWith(prefix));
  if (
    !isValidPrefix ||
    (!filename.endsWith(".dmg") && !filename.endsWith(".delta"))
  ) {
    return new Response("Invalid file format", {
      status: 400,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }

  const bucket = env.VITE_DOWNLOAD_BUCKET_STRING;
  const key = `downloads/${filename}`;

  const credentials = {
    accessKeyId: env.MY_AWS_ACCESS_KEY,
    secretAccessKey: env.MY_AWS_SECRET_KEY
  };

  try {
    const client = new S3Client({
      region: env.AWS_REGION,
      credentials: credentials
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await client.send(command);

    if (!response.Body) {
      console.error(`File not found in S3: ${key}`);
      return new Response("File not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // Get content type based on file extension
    const contentType = filename.endsWith(".dmg")
      ? "application/x-apple-diskimage"
      : "application/octet-stream";

    // Stream the file content from S3
    const body = await response.Body.transformToByteArray();

    console.log(`✓ Serving ${filename} (${body.length} bytes)`);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": body.length.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error(`Failed to fetch ${filename} from S3:`, error);

    // Check if it's a not found error
    if (error instanceof Error && error.name === "NoSuchKey") {
      return new Response("File not found in storage", {
        status: 404,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
}
