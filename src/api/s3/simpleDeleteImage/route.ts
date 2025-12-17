import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/dist/server/web/spec-extension/request";
import { NextResponse } from "next/server";

import { env } from "@/env.mjs";

interface InputData {
  key: string;
  newAttachmentString: string;
  type: string;
  id: number;
}

export async function POST(input: NextRequest) {
  const inputData = (await input.json()) as InputData;
  const { key } = inputData;
  // Parse the url to get the bucket and key

  const s3params = {
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  const client = new S3Client({
    region: env.AWS_REGION,
  });

  const command = new DeleteObjectCommand(s3params);
  const res = await client.send(command);
  return NextResponse.json(res);
}
