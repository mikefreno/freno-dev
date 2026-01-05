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

    const { uploadURL, key } = await api.misc.getPreSignedURL.mutate({
      type,
      title,
      filename
    });

    console.log("url: " + uploadURL, "key: " + key);

    const ext = /^.+\.([^.]+)$/.exec(filename);
    let contentType = "application/octet-stream";

    if (ext) {
      const extension = ext[1].toLowerCase();
      if (["mp4", "webm", "mov", "quicktime"].includes(extension)) {
        contentType =
          extension === "mov" ? "video/quicktime" : `video/${extension}`;
      } else {
        contentType = `image/${extension}`;
      }
    }

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

    // Only create thumbnails for images
    const isImage = contentType.startsWith("image/");
    if (type === "blog" && isImage) {
      try {
        const thumbnail = await resizeImage(file, 200, 200, 0.8);

        const thumbnailFilename = filename.replace(/(\.[^.]+)$/, "-small$1");

        const { uploadURL: thumbnailUploadURL } =
          await api.misc.getPreSignedURL.mutate({
            type,
            title,
            filename: thumbnailFilename
          });

        const thumbnailUploadResponse = await fetch(thumbnailUploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg"
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
