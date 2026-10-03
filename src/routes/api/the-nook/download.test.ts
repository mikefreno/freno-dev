import { describe, expect, it, mock, beforeEach } from "bun:test";

// The route's contracts:
//   1. Every click is recorded through the shared analytics buffer with the
//      path, referrer, country and device type the funnel needs.
//   2. The response is a no-store 302 to the newest release enclosure, so a
//      CDN can never serve a later click without it reaching this handler.
//   3. An unreadable appcast degrades to 503 — but the click is still logged,
//      because a failed download is exactly the event worth seeing.

type Entry = Record<string, unknown>;
const logged: Entry[] = [];
let appcastXml = "";
let s3ShouldThrow = false;
let flushCalls = 0;

mock.module("~/env/server", () => ({
  env: {
    AWS_REGION: "us-east-1",
    MY_AWS_ACCESS_KEY: "test-key",
    MY_AWS_SECRET_KEY: "test-secret",
    VITE_DOWNLOAD_BUCKET_STRING: "test-bucket"
  }
}));

mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send() {
      if (s3ShouldThrow) throw new Error("s3 unavailable");
      return {
        Body: appcastXml
          ? { transformToString: async () => appcastXml }
          : null
      };
    }
  },
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
}));

mock.module("vinxi/http", () => ({
  getRequestIP: () => null
}));

mock.module("~/server/analytics", () => ({
  logVisit: async (entry: Entry) => {
    logged.push(entry);
  },
  // The route must flush, not merely buffer: the batch timer is not
  // guaranteed to survive the response on serverless.
  flushAnalytics: async () => {
    flushCalls += 1;
  },
  // Mirrors the real enrichment contract: deviceType is derived from the UA.
  enrichAnalyticsEntry: (entry: Entry) => ({
    ...entry,
    deviceType: String(entry.userAgent ?? "").includes("Macintosh")
      ? "desktop"
      : null
  })
}));

const { GET } = await import("./download");
const { pickEnclosure, invalidateDownloadCache } = await import("./_download");

const DMG = "https://cdn.example/TheNook-0.6.3.dmg";
const ZIP = "https://cdn.example/TheNook-0.6.3.zip";

const appcast = (urls: string[]) =>
  `<?xml version="1.0"?><rss><channel><item>` +
  urls
    .map(
      (u) =>
        `<enclosure url="${u}" sparkle:version="1" length="1" type="application/octet-stream"/>`
    )
    .join("") +
  `</item></channel></rss>`;

function request(headers: Record<string, string> = {}, query = "") {
  return {
    request: new Request(
      `https://nook.freno.me/api/the-nook/download${query}`,
      { headers }
    ),
    nativeEvent: {}
  } as never;
}

const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

beforeEach(() => {
  logged.length = 0;
  appcastXml = appcast([DMG, ZIP]);
  s3ShouldThrow = false;
  flushCalls = 0;
  invalidateDownloadCache();
});

describe("GET /api/the-nook/download", () => {
  it("logs the click and 302s to the newest dmg", async () => {
    const res = await GET(request({ referer: "https://nook.freno.me/" }));

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(DMG);
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    expect(logged.length).toBe(1);
    expect(logged[0]).toMatchObject({
      path: "/api/the-nook/download",
      method: "GET",
      referrer: "https://nook.freno.me/"
    });
    // Flushed within the request, not left to the batch timer.
    expect(flushCalls).toBe(1);
  });

  it("derives the device type from the user agent", async () => {
    await GET(request({ "user-agent": MAC_UA }));
    expect(logged[0]!.deviceType).toBe("desktop");
  });

  it("records the edge country, and lets ?c= override it", async () => {
    await GET(request({ "x-vercel-ip-country": "GB" }));
    expect(logged[0]!.country).toBe("GB");

    invalidateDownloadCache();
    await GET(request({ "cf-ipcountry": "DE" }));
    expect(logged[1]!.country).toBe("DE");

    invalidateDownloadCache();
    await GET(request({ "x-vercel-ip-country": "GB" }, "?c=JP"));
    expect(logged[2]!.country).toBe("JP");
  });

  it("falls back to the forwarded address when no request IP is available", async () => {
    await GET(request({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }));
    expect(logged[0]!.ipAddress).toBe("198.51.100.9");
  });

  it("still logs the click when the appcast cannot be read", async () => {
    s3ShouldThrow = true;
    const res = await GET(request());

    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(logged.length).toBe(1);
  });

  it("503s when the appcast carries no enclosure", async () => {
    appcastXml = "<?xml version='1.0'?><rss><channel></channel></rss>";
    invalidateDownloadCache();

    const res = await GET(request());
    expect(res.status).toBe(503);
  });

  it("captures campaign tags from the click URL and the referer", async () => {
    await GET(
      request(
        { referer: "https://nook.freno.me/?utm_source=hn&utm_campaign=launch" },
        "?utm_medium=post"
      )
    );

    expect(logged[0]).toMatchObject({
      utmSource: "hn",
      utmMedium: "post",
      utmCampaign: "launch"
    });
  });

  it("logs nulls when nothing is tagged", async () => {
    await GET(request({ referer: "https://nook.freno.me/" }));
    expect(logged[0]).toMatchObject({
      utmSource: null,
      utmMedium: null,
      utmCampaign: null
    });
  });
});

describe("pickEnclosure", () => {
  it("prefers a dmg over a zip even when the zip comes first", () => {
    expect(pickEnclosure(appcast([ZIP, DMG]))).toBe(DMG);
  });

  it("falls back to a zip, then to any enclosure", () => {
    expect(pickEnclosure(appcast([ZIP]))).toBe(ZIP);
    expect(pickEnclosure(appcast(["https://cdn.example/notes.txt"]))).toBe(
      "https://cdn.example/notes.txt"
    );
  });

  it("returns null when there is no enclosure", () => {
    expect(pickEnclosure("<rss><channel></channel></rss>")).toBeNull();
  });
});
