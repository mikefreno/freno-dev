import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env.mjs";

const assets: Record<string, string> = {
  "shapes-with-abigail": "shapes-with-abigail.apk",
  "magic-delve": "magic-delve.apk",
  cork: "Cork.zip",
};

const bucket = "frenomedownloads";

export async function GET(
  _: Request,
  context: {
    params: Promise<{ asset_name: string }>;
  },
) {
  const readyParams = await context.params;
  const params = {
    Bucket: bucket,
    Key: assets[readyParams.asset_name],
    Expires: 60 * 60,
  };
  const credentials = {
    accessKeyId: env._AWS_ACCESS_KEY,
    secretAccessKey: env._AWS_SECRET_KEY,
  };
  try {
    const client = new S3Client({
      region: env.AWS_REGION,
      credentials: credentials,
    });

    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 120 });
    return NextResponse.json({ downloadURL: signedUrl });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ error: e }, { status: 400 });
  }
}
