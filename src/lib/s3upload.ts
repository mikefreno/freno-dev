/**
 * S3 Upload Utility for SolidStart
 * Uploads files to S3 using pre-signed URLs from tRPC
 */

export default async function AddImageToS3(
  file: Blob | File,
  title: string,
  type: string,
): Promise<string | undefined> {
  try {
    // Get pre-signed URL from tRPC endpoint
    const getPreSignedResponse = await fetch("/api/trpc/misc.getPreSignedURL", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: type,
        title: title,
        filename: (file as File).name,
      }),
    });

    if (!getPreSignedResponse.ok) {
      throw new Error("Failed to get pre-signed URL");
    }

    const responseData = await getPreSignedResponse.json();
    const { uploadURL, key } = responseData.result.data as {
      uploadURL: string;
      key: string;
    };

    console.log("url: " + uploadURL, "key: " + key);

    // Upload file to S3 using pre-signed URL
    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: file as File,
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
