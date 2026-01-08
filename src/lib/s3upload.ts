/**
 * S3 Upload Utility for SolidStart
 * Uploads files to S3 using pre-signed URLs from tRPC
 * Automatically converts images to WebP format for better compression
 */

import { api } from "~/lib/api";
import { resizeImage, convertToWebP } from "~/lib/resize-utils";

export default async function AddImageToS3(
  file: Blob | File,
  title: string,
  type: string
): Promise<string | undefined> {
  try {
    const filename = (file as File).name;

    const ext = /^.+\.([^.]+)$/.exec(filename);
    let contentType = "application/octet-stream";
    let isImage = false;
    let isVideo = false;

    if (ext) {
      const extension = ext[1].toLowerCase();
      if (["mp4", "webm", "mov", "quicktime"].includes(extension)) {
        contentType =
          extension === "mov" ? "video/quicktime" : `video/${extension}`;
        isVideo = true;
      } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        isImage = true;
      }
    }

    let fileToUpload: Blob | File = file;
    let finalFilename = filename;

    // Convert images to WebP for better compression
    if (isImage) {
      contentType = "image/webp";
      fileToUpload = await convertToWebP(file, 0.85);
      finalFilename = filename.replace(/\.[^.]+$/, ".webp");
    }

    const { uploadURL, key } = await api.misc.getPreSignedURL.mutate({
      type,
      title,
      filename: finalFilename
    });

    console.log("url: " + uploadURL, "key: " + key);

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": contentType
      },
      body: fileToUpload
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to S3");
    }

    // Create thumbnails for images (blog posts only)
    if (type === "blog" && isImage) {
      try {
        const thumbnail = await resizeImage(file, 200, 200, 0.8);

        const thumbnailFilename = finalFilename.replace(
          /(\.[^.]+)$/,
          "-small$1"
        );

        const { uploadURL: thumbnailUploadURL } =
          await api.misc.getPreSignedURL.mutate({
            type,
            title,
            filename: thumbnailFilename
          });

        const thumbnailUploadResponse = await fetch(thumbnailUploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": "image/webp"
          },
          body: thumbnail
        });

        if (!thumbnailUploadResponse.ok) {
          console.error("Failed to upload thumbnail to S3");
        } else {
          console.log("Thumbnail uploaded successfully");
        }
      } catch (thumbnailError) {
        console.error("Thumbnail creation/upload failed:", thumbnailError);
      }
    }

    return key;
  } catch (e) {
    console.error("S3 upload error:", e);
    throw e;
  }
}
