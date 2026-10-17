import { describe, expect, it, mock, beforeEach } from "bun:test";

// The contract The Nook's Settings > Changelog tab is built on:
//   1. One list, newest first, from the appcast plus the archive of releases
//      the appcast has aged out — the same merge /changelog renders.
//   2. Structured notes and ISO dates, so the client renders instead of
//      parsing HTML it would only take apart again.
//   3. An unreadable appcast is a 503, never an archived-only 200 that reads
//      as current.

type Release = {
  version: string;
  build: string | null;
  date: string | null;
  sections: { title: string; bullets: string[] }[];
};

let appcastXml = "";
let s3ShouldThrow = false;

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

const { GET } = await import("./releases.json");
const { invalidateAppcastCache } = await import("./_appcast");
const { isoDateOrNull, sectionsFromHtml } = await import("./_releases");
const { ARCHIVED_RELEASES } = await import("~/routes/nook/changelog-archive");

const item = (version: string, pubDate: string, notes: string) => `
  <item>
    <title>Version ${version}</title>
    <pubDate>${pubDate}</pubDate>
    <sparkle:version>${version === "0.6.3" ? "10" : "9"}</sparkle:version>
    <sparkle:shortVersionString>${version}</sparkle:shortVersionString>
    <description><![CDATA[${notes}]]></description>
    <enclosure url="https://cdn.example/TheNook-${version}.dmg" type="application/octet-stream"/>
  </item>`;

const NOTES =
  "<p><b>Added</b></p><ul><li>Changelog tab in Settings.</li></ul>" +
  "<p><b>Fixed</b></p><ul><li>Call actions press only their own button; &quot;End Call&quot; no longer matches &quot;Send&quot;.</li></ul>";

const appcast = (items: string) =>
  `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;

const request = () =>
  ({
    request: new Request("https://freno.me/api/the-nook/releases.json"),
    nativeEvent: {}
  }) as never;

async function body(): Promise<{ releases: Release[] }> {
  const res = await GET(request());
  return (await res.json()) as { releases: Release[] };
}

// The fixture appcast: two releases it lists live, newest first.
const LIVE = ["0.6.3", "0.6.2"];

beforeEach(() => {
  appcastXml = appcast(
    item("0.6.3", "Fri, 02 Oct 2026 23:29:42 -0400", NOTES) +
      item("0.6.2", "Thu, 24 Sep 2026 21:16:04 -0400", NOTES)
  );
  s3ShouldThrow = false;
  invalidateAppcastCache();
});

describe("GET /api/the-nook/releases.json", () => {
  it("serves the appcast releases newest first, cacheable for five minutes", async () => {
    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");

    const { releases } = await body();
    expect(releases.map((r) => r.version)).toEqual([...LIVE, ...agedOut(...LIVE)]);
    expect(releases[0].build).toBe("10");
  });

  it("splits the published notes into titled bullet groups", async () => {
    const [first] = (await body()).releases;

    expect(first!.sections).toEqual([
      { title: "Added", bullets: ["Changelog tab in Settings."] },
      {
        title: "Fixed",
        bullets: [
          'Call actions press only their own button; "End Call" no longer matches "Send".'
        ]
      }
    ]);
  });

  it("dates a release on its own day, not the UTC one", async () => {
    const releases = (await body()).releases;

    // 23:29 -0400 is 03:29Z the next day; the release is still dated the 2nd.
    expect(releases[0]!.date).toBe("2026-10-02");
    expect(releases[1]!.date).toBe("2026-09-24");
  });

  it("appends the archived releases the appcast has aged out", async () => {
    const releases = (await body()).releases;
    const archived = releases.filter((r) => !LIVE.includes(r.version));

    expect(archived.map((r) => r.version)).toEqual(agedOut(...LIVE));
    expect(archived[0]!.build).toBeNull();
    // Archive dates are already calendar dates and pass through untouched.
    expect(archived[0]!.date).toBe(ARCHIVED_RELEASES[0]!.date);
    expect(archived[0]!.sections.length).toBeGreaterThan(0);
  });

  it("lists a version once when the appcast and the archive both carry it", async () => {
    appcastXml = appcast(item("0.5.0", "Mon, 07 Sep 2026 16:11:44 -0400", NOTES));
    invalidateAppcastCache();

    const releases = (await body()).releases;
    const matches = releases.filter((r) => r.version === "0.5.0");

    expect(matches.length).toBe(1);
    // The live item wins: it carries the build number the archive lacks.
    expect(matches[0]!.build).toBe("9");
    expect(matches[0]!.date).toBe("2026-09-07");
  });

  it("503s when the appcast cannot be read, rather than serving archive-only notes", async () => {
    s3ShouldThrow = true;

    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Release list unavailable"
    );
  });
});

describe("notes the appcast lost", () => {
  // Sparkle rebuilds every item from its DMG and removes the description of an
  // item whose DMG carries no notes file, so a release the appcast still lists
  // can arrive with nothing to show. 0.8.0 and 0.7.0 did exactly that, in both
  // this feed and /changelog (NOOK-304): a version header over an empty row.
  const itemWithoutNotes = (version: string) => `
  <item>
    <title>${version}</title>
    <pubDate>Fri, 02 Oct 2026 23:29:42 -0400</pubDate>
    <sparkle:version>9</sparkle:version>
    <sparkle:shortVersionString>${version}</sparkle:shortVersionString>
    <enclosure url="https://cdn.example/TheNook-${version}.dmg" type="application/octet-stream"/>
  </item>`;

  it("falls back to the archive's copy for a release listed without notes", async () => {
    appcastXml = appcast(
      item("0.6.3", "Fri, 02 Oct 2026 23:29:42 -0400", NOTES) +
        itemWithoutNotes("0.5.0")
    );
    invalidateAppcastCache();

    const lost = (await body()).releases.find((r) => r.version === "0.5.0")!;

    expect(lost.sections).toEqual(
      sectionsFromHtml(
        ARCHIVED_RELEASES.find((r) => r.version === "0.5.0")!.notesHtml
      )
    );
    expect(lost.sections.length).toBeGreaterThan(0);
    // Still the live row, not the archived one: it carries the build number.
    expect(lost.build).toBe("9");
  });

  it("keeps the published notes when the archive has them too", async () => {
    appcastXml = appcast(item("0.5.0", "Mon, 07 Sep 2026 16:11:44 -0400", NOTES));
    invalidateAppcastCache();

    const [release] = (await body()).releases;

    expect(release!.sections).toEqual(sectionsFromHtml(NOTES));
  });
});

describe("the checked-in archive", () => {
  // The durable copy of what every release said. The appcast carries only the
  // DMGs the release machine still holds, and it loses notes when it rebuilds,
  // so a release missing here is a release the changelog can blank out later
  // with nothing left to fall back to.
  it("holds every release that shipped notes, newest first", () => {
    expect(ARCHIVED_RELEASES.map((r) => r.version)).toEqual([
      "0.9.0",
      "0.8.0",
      "0.7.0",
      "0.6.3",
      "0.6.2",
      "0.6.0",
      "0.5.0",
      "0.4.1",
      "0.4.0",
      "0.3.0",
      "0.2.0"
      // 0.6.1 and 0.3.1 shipped without written notes and are absent by design.
    ]);
  });

  it("holds notes for every release it lists, and a date for each", () => {
    for (const release of ARCHIVED_RELEASES) {
      expect(
        sectionsFromHtml(release.notesHtml).length,
        `${release.version} has no notes`
      ).toBeGreaterThan(0);
      expect(isoDateOrNull(release.date), release.version).not.toBeNull();
    }
  });
});

describe("sectionsFromHtml", () => {
  it("labels an unlabelled list as Notes", () => {
    expect(sectionsFromHtml("<ul><li>Fixes</li></ul>")).toEqual([
      { title: "Notes", bullets: ["Fixes"] }
    ]);
  });

  it("joins a bullet the HTML wrapped across lines, and drops empty ones", () => {
    expect(
      sectionsFromHtml(
        "<p><b>Fixed</b></p><ul>\n<li>a bullet\n   split over\n   lines</li><li> </li></ul>"
      )
    ).toEqual([{ title: "Fixed", bullets: ["a bullet split over lines"] }]);
  });

  it("returns no sections for empty or note-less HTML", () => {
    expect(sectionsFromHtml("")).toEqual([]);
    expect(sectionsFromHtml("<p><b>Added</b></p>")).toEqual([]);
  });

  it("decodes the entities embed_release_notes.py's html.escape writes", () => {
    // Python's html.escape prefers the hex form for apostrophes; this is what
    // the live appcast actually carries (NOOK-565).
    expect(
      sectionsFromHtml(
        "<p><b>Added</b></p><ul><li>Each app&#x27;s meter &amp; the icon</li><li>don&#x27;t expand</li></ul>"
      )
    ).toEqual([
      {
        title: "Added",
        bullets: ["Each app's meter & the icon", "don't expand"]
      }
    ]);
  });
});

describe("isoDateOrNull", () => {
  it("reads an RFC-1123 pubDate at its own offset", () => {
    expect(isoDateOrNull("Sat, 03 Oct 2026 00:00:00 +0000")).toBe("2026-10-03");
    expect(isoDateOrNull("Fri, 02 Oct 2026 23:29:42 -0400")).toBe("2026-10-02");
    expect(isoDateOrNull("Tue, 06 Oct 2026 09:00:00 +0200")).toBe("2026-10-06");
  });

  it("passes a calendar date through and rejects junk", () => {
    expect(isoDateOrNull("2026-09-06")).toBe("2026-09-06");
    expect(isoDateOrNull("sometime in September")).toBeNull();
    expect(isoDateOrNull("")).toBeNull();
    expect(isoDateOrNull(null)).toBeNull();
  });
});

/**
 * The tail a case should expect: the whole archive in file order (newest
 * first) minus the versions its fixture appcast lists live. A version is
 * listed once, from the appcast, and the archive copy behind it only fills
 * notes the feed lost — so the tail shrinks as the archive grows.
 */
const agedOut = (...live: string[]) =>
  ARCHIVED_RELEASES.map((r) => r.version).filter((v) => !live.includes(v));
