/**
 * S3 Upload Utility for SolidStart
 * Uploads files to S3 using pre-signed URLs from tRPC
 */

import { api } from "~/lib/api";

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

    // Upload file to S3 using pre-signed URL
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

    return key;
  } catch (e) {
    console.error("S3 upload error:", e);
    throw e;
  }
}
