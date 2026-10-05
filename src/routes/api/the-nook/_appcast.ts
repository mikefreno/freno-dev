import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env/server";

/**
 * Appcast reading for The Nook, shared by the download resolver and the
 * /changelog page. The same route-module tree-shake rule applies as in
 * `_download.ts`: helpers live in an underscore-prefixed module because
 * route files may only export HTTP handlers.
 */

const APPCAST_KEY = "api/TheNook/appcast.xml";

/** Kept in step with the appcast route's own 5-minute cache. */
const TTL_MS = 5 * 60 * 1000;

export interface AppcastRelease {
  /** Human version, e.g. "1.2.0" — from sparkle:shortVersionString. */
  version: string;
  /** Build number from sparkle:version, when present. */
  build: string | null;
  /** Release date as published (already human-formatted in the appcast). */
  date: string | null;
  /** HTML release notes exactly as the Sparkle updater receives them. */
  notesHtml: string;
}

function extract(tag: string, xml: string): string | null {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i")
  );
  return match?.[1]?.trim() ?? null;
}

function decodeCdata(value: string): string {
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  const inner = (cdata ? cdata[1] : value).trim();
  if (cdata) return inner;
  // Non-CDATA text is XML-escaped; descriptions arrive as escaped HTML.
  return inner
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Strips the conventional "Version " prefix from an appcast item title. */
function versionFromTitle(title: string): string {
  return title.replace(/^version\s+/i, "");
}

/**
 * Parses a Sparkle appcast into release entries, newest first (the appcast's
 * own order). Empty or unparseable input yields an empty list — the page
 * renders its empty state rather than an error.
 */
export function parseAppcastItems(xml: string): AppcastRelease[] {
  const releases: AppcastRelease[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    if (!item) continue;
    const short = decodeCdata(extract("sparkle:shortVersionString", item) ?? "");
    const title = versionFromTitle(decodeCdata(extract("title", item) ?? ""));
    const version = short || title;
    if (!version) continue;
    releases.push({
      version,
      build: decodeCdata(extract("sparkle:version", item) ?? "") || null,
      date: decodeCdata(extract("pubDate", item) ?? "") || null,
      notesHtml: decodeCdata(extract("description", item) ?? "")
    });
  }
  return releases;
}

let cached: { xml: string; at: number } | null = null;

/** Drops the cached appcast so the next read hits S3 again. */
export function invalidateAppcastCache(): void {
  cached = null;
}

/** Reads (and briefly caches) the raw appcast XML from the download bucket. */
export async function fetchAppcastXml(): Promise<string | null> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.xml;
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
      Key: APPCAST_KEY
    })
  );
  if (!response.Body) return null;

  const xml = await response.Body.transformToString();
  cached = { xml, at: Date.now() };
  return xml;
}

/** The releases behind /changelog, or an empty list when the appcast is unreadable. */
export async function fetchAppcastReleases(): Promise<AppcastRelease[]> {
  const xml = await fetchAppcastXml();
  return xml ? parseAppcastItems(xml) : [];
}
