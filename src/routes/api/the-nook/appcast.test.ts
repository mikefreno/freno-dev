import { describe, expect, it } from "bun:test";
import { parseAppcastItems } from "./_appcast";

// The /changelog page renders exactly what the Sparkle updater receives, so
// the parser's contract is the appcast's contract: newest-first items, a
// shortVersionString title with the raw <title> as fallback, CDATA and
// plain-encoded descriptions both accepted, garbage in → empty list out.

const item = (over: Record<string, string>) => `
  <item>
    <title>Version ${over.title ?? "1.0.0"}</title>
    ${over.short ? `<sparkle:shortVersionString>${over.short}</sparkle:shortVersionString>` : ""}
    ${over.build ? `<sparkle:version>${over.build}</sparkle:version>` : ""}
    ${over.date ? `<pubDate>${over.date}</pubDate>` : ""}
    ${over.desc ?? `<description><![CDATA[<ul><li>Fixes</li></ul>]]></description>`}
    <enclosure url="https://example.com/Nook-1.0.0.dmg" type="application/x-apple-diskimage"/>
  </item>`;

describe("parseAppcastItems", () => {
  it("parses newest-first items with version, build, date and CDATA notes", () => {
    const xml = `<rss><channel>
      ${item({ title: "1.2.0", short: "1.2.0", build: "42", date: "Sat, 03 Oct 2026 12:00:00 +0000" })}
      ${item({ title: "1.1.0", short: "1.1.0", build: "41", date: "Fri, 02 Oct 2026 12:00:00 +0000" })}
    </channel></rss>`;

    const releases = parseAppcastItems(xml);
    expect(releases.length).toBe(2);
    expect(releases[0].version).toBe("1.2.0");
    expect(releases[0].build).toBe("42");
    expect(releases[0].date).toContain("03 Oct 2026");
    expect(releases[0].notesHtml).toBe("<ul><li>Fixes</li></ul>");
    expect(releases[1].version).toBe("1.1.0");
  });

  it("falls back to the plain title when shortVersionString is absent", () => {
    const xml = `<rss><channel>${item({ title: "1.0.0" })}</channel></rss>`;
    const releases = parseAppcastItems(xml);
    expect(releases[0].version).toBe("1.0.0");
    expect(releases[0].build).toBeNull();
  });

  it("accepts non-CDATA escaped-HTML descriptions", () => {
    const xml = `<rss><channel>
      ${item({ desc: "<description>&lt;p&gt;Hello&lt;/p&gt;</description>" })}
    </channel></rss>`;
    expect(parseAppcastItems(xml)[0].notesHtml).toBe("<p>Hello</p>");
  });

  it("returns [] for empty, non-XML, or item-less input", () => {
    expect(parseAppcastItems("")).toEqual([]);
    expect(parseAppcastItems("<html>not an appcast</html>")).toEqual([]);
    expect(parseAppcastItems("<rss><channel></channel></rss>")).toEqual([]);
  });

  it("skips items with no version signal at all", () => {
    const xml = `<rss><channel>
      <item><description><![CDATA[<p>orphan</p>]]></description></item>
      ${item({ title: "1.0.0" })}
    </channel></rss>`;
    const releases = parseAppcastItems(xml);
    expect(releases.length).toBe(1);
    expect(releases[0].version).toBe("1.0.0");
  });
});
