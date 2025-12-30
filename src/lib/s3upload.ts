/**
 * S3 Upload Utility for SolidStart
 * Uploads files to S3 using pre-signed URLs from tRPC
 */

import { api } from "~/lib/api";
import { resizeImage } from "~/lib/resize-utils";

export default async function AddImageToS3(
  file: Blob | File,
  title: string,
  type: string
): Promise<string | undefined> {
  try {
    const filename = (file as File).name;

    // Get pre-signed URL from tRPC endpoint
    const { uploadURL, key } = await api.misc.getPreSignedURL.mutate({
      type,
      title,
      filename
    });

    console.log("url: " + uploadURL, "key: " + key);

    // Extract content type from filename extension
    const ext = /^.+\.([^.]+)$/.exec(filename);
    const contentType = ext ? `image/${ext[1]}` : "application/octet-stream";

    // Upload original file to S3 using pre-signed URL
    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": contentType
      },
      body: file as File
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to S3");
    }

    // For blog cover images, also create and upload a thumbnail
    if (type === "blog") {
      try {
        // Create thumbnail (max 200x200px for sidebar display)
        const thumbnail = await resizeImage(file, 200, 200, 0.8);

        // Generate thumbnail filename: insert "-small" before extension
        const thumbnailFilename = filename.replace(
          /(\.[^.]+)$/,
          "-small$1"
        );

        // Get pre-signed URL for thumbnail
        const { uploadURL: thumbnailUploadURL } =
          await api.misc.getPreSignedURL.mutate({
            type,
            title,
            filename: thumbnailFilename
          });

        // Upload thumbnail to S3
        const thumbnailUploadResponse = await fetch(thumbnailUploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg" // Thumbnails are always JPEG
          },
          body: thumbnail
        });

        if (!thumbnailUploadResponse.ok) {
          console.error("Failed to upload thumbnail to S3");
          // Don't fail the entire upload if thumbnail fails
        } else {
          console.log("Thumbnail uploaded successfully");
        }
      } catch (thumbnailError) {
        console.error("Thumbnail creation/upload failed:", thumbnailError);
        // Don't fail the entire upload if thumbnail fails
      }
    }

    return key;
  } catch (e) {
    console.error("S3 upload error:", e);
    throw e;
  }
}
