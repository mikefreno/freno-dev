// One-off: upload the backfilled appcast to the download bucket.
// Usage: cd ~/Code/freno-dev && bun --env-file=.env /tmp/upload-appcast.ts <file>
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";

const [, , file] = process.argv;
if (!file) {
  console.error("usage: bun --env-file=.env upload-appcast.ts <appcast.xml>");
  process.exit(1);
}

const body = readFileSync(file);
const xml = body.toString("utf8");
// Guard: refuse to upload without all three release descriptions present.
for (const v of ["0.6.0", "0.6.2", "0.6.3"]) {
  if (!xml.includes(`sparkle:shortVersionString>${v}<`)) {
    console.error(`refusing: item for ${v} missing`);
    process.exit(1);
  }
}

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.MY_AWS_SECRET_KEY!
  }
});

await client.send(
  new PutObjectCommand({
    Bucket: process.env.VITE_DOWNLOAD_BUCKET_STRING,
    Key: "api/TheNook/appcast.xml",
    Body: body,
    ContentType: "application/xml; charset=utf-8"
  })
);
console.log("uploaded", file, "->", "api/TheNook/appcast.xml");
