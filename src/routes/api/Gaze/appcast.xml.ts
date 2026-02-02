import type { APIEvent } from "@solidjs/start/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env/server";

/**
 * Serves the Gaze appcast.xml file from S3
 * This endpoint is used by Sparkle updater to check for new versions
 *
 * URL: https://freno.me/api/Gaze/appcast.xml
 */
export async function GET(event: APIEvent) {
  const bucket = env.VITE_DOWNLOAD_BUCKET_STRING;
  const key = "api/Gaze/appcast.xml";

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
      return new Response("Appcast not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // Stream the XML content from S3
    const body = await response.Body.transformToString();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        "Access-Control-Allow-Origin": "*" // Allow CORS for appcast
      }
    });
  } catch (error) {
    console.error("Failed to fetch appcast:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
}
