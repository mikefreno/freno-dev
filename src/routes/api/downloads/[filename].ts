import type { APIEvent } from "@solidjs/start/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env/server";
import { trackDownload } from "~/server/track-download";

/**
 * Serves macOS app DMG files and delta updates from S3
 * This endpoint is used by Sparkle updater to download updates
 *
 * Handles:
 * - Full DMG files: /api/downloads/Gaze-0.2.2.dmg, /api/downloads/InputHalo-0.1.0.dmg
 * - Delta updates: /api/downloads/Gaze3-2.delta, /api/downloads/Nook17-9.delta
 *
 * The Nook delta files are named after the app bundle ("Nook"), not the DMG
 * ("TheNook"), so both prefixes must be allowed (NOOK-337).
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

  // Prefix → canonical asset key, so a version bump stays one asset in
  // analytics rather than one per release.
  const assetKeys: Record<string, string> = {
    Gaze: "gaze",
    InputHalo: "inputhalo",
    TheNook: "thenook",
    Nook: "thenook"
  };

  const asset = Object.keys(assetKeys).find((prefix) =>
    filename.startsWith(prefix)
  );
  if (
    !asset ||
    (!filename.endsWith(".dmg") &&
      !filename.endsWith(".delta") &&
      !filename.endsWith(".zip"))
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

    const contentType = filename.endsWith(".zip")
      ? "application/zip"
      : filename.endsWith(".dmg")
        ? "application/x-apple-diskimage"
        : "application/octet-stream";

    const body = await response.Body.transformToByteArray();

    console.log(`✓ Serving ${filename} (${body.length} bytes)`);

    await trackDownload(event, assetKeys[asset]!);

    // SAFETY: `transformToByteArray` yields `Uint8Array<ArrayBufferLike>`, which the
    // DOM lib's `BufferSource` (ArrayBuffer-backed) does not accept, though undici
    // takes it as-is at runtime. State the intent at the one boundary it hits.
    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": body.length.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
        // Deliberately open: these are public installer files with no cookies or
        // credentials, fetched by Sparkle and by direct browser navigation.
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error(`Failed to fetch ${filename} from S3:`, error);

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
