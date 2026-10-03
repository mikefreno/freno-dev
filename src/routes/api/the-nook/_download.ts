import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env/server";

/**
 * Download resolution for The Nook, kept out of the route module on purpose.
 *
 * Vinxi's route tree-shake (`vinxi/lib/plugins/tree-shake.babel.js`) deletes
 * every exported declaration in a route file whose name is not in the
 * `?pick=` list the router asks for — and a route is picked as `pick=GET`.
 * A helper exported from `download.ts` is therefore removed while `GET`
 * still references it, which fails at runtime with "is not defined" in dev
 * and in the production bundle alike. Only HTTP handlers may be exported
 * from a route; helpers live here, where the transform never runs. Same
 * reason `_lib.ts` exists.
 */

const APPCast_KEY = "api/TheNook/appcast.xml";

/** Kept in step with the appcast route's own 5-minute cache. */
const RESOLVE_TTL_MS = 5 * 60 * 1000;

const ENCLOSURE_RE = /<enclosure\b[^>]*\burl="([^"]+)"/gi;

/**
 * Picks the newest release artifact out of a Sparkle appcast: the first
 * enclosure that is a .dmg, else the first .zip, else the first enclosure
 * of any kind. Enclosures appear in newest-first order.
 */
export function pickEnclosure(xml: string): string | null {
  const urls: string[] = [];
  for (const match of xml.matchAll(ENCLOSURE_RE)) {
    if (match[1]) urls.push(match[1]);
  }
  return (
    urls.find((u) => /\.dmg(\?|$)/i.test(u)) ??
    urls.find((u) => /\.zip(\?|$)/i.test(u)) ??
    urls[0] ??
    null
  );
}

let cached: { url: string; at: number } | null = null;

/** Drops the cached enclosure so the next request re-reads the appcast. */
export function invalidateDownloadCache(): void {
  cached = null;
}

/** Resolves (and briefly caches) the current download URL from the appcast. */
export async function resolveLatestDownload(): Promise<string | null> {
  if (cached && Date.now() - cached.at < RESOLVE_TTL_MS) {
    return cached.url;
  }

  const client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.MY_AWS_ACCESS_KEY,
      secretAccessKey: env.MY_AWS_SECRET_KEY
    }
  });

  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.VITE_DOWNLOAD_BUCKET_STRING,
      Key: APPCast_KEY
    })
  );
  if (!response.Body) return null;

  const xml = await response.Body.transformToString();
  const url = pickEnclosure(xml);
  if (url) cached = { url, at: Date.now() };
  return url;
}
