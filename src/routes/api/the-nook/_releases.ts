/**
 * The release list for The Nook's in-app changelog (Settings > Changelog).
 *
 * The /changelog page already answers this question, but only as HTML, and it
 * assembles the list inside the route component. A native client must not
 * couple to that markup, and the appcast alone is not the full story: releases
 * older than the appcast's retention live only in the checked-in archive. So
 * this module owns that merge — live appcast items, their notes filled from the
 * archive wherever the feed lost them, then archived releases the appcast has
 * aged out — and normalizes it into data a client can render without parsing
 * HTML. `withArchivedNotes` is exported so /changelog runs the identical rule
 * rather than a second copy of it.
 *
 * Underscore-prefixed file — not a route.
 */
import { ARCHIVED_RELEASES } from "~/routes/nook/changelog-archive";
import { fetchAppcastReleases, type AppcastRelease } from "./_appcast";

export interface ReleaseSection {
  /** "Added" / "Changed" / "Fixed"; "Notes" when the notes carry no label. */
  title: string;
  bullets: string[];
}

export interface AppRelease {
  version: string;
  /** Build number, null for archived releases (they carry none). */
  build: string | null;
  /** ISO calendar date, "2026-10-02"; null when no date was published. */
  date: string | null;
  sections: ReleaseSection[];
}

const ENTITY_REPLACEMENTS: [RegExp, string][] = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&nbsp;/g, " "],
  // Last, so "&amp;lt;" cannot decode twice.
  [/&amp;/g, "&"]
];

function decodeEntities(text: string): string {
  return ENTITY_REPLACEMENTS.reduce((acc, [re, to]) => acc.replace(re, to), text);
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** Collapses the whitespace an HTML source wraps bullets with. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Reads the notes shape `embed_release_notes.py` writes —
 * `<p><b>Added</b></p><ul><li>…</li></ul>` — into titled bullet groups.
 *
 * A `<ul>` with no label before it (what `generate_appcast` writes on its own)
 * becomes "Notes". A `<p>` is taken as the next list's label rather than as
 * prose, which is safe for notes this pipeline generates and degrades to a
 * stray heading if that ever changes.
 */
export function sectionsFromHtml(html: string): ReleaseSection[] {
  const sections: ReleaseSection[] = [];
  let label = "";

  for (const block of html.matchAll(/<p>([\s\S]*?)<\/p>|<ul[^>]*>([\s\S]*?)<\/ul>/gi)) {
    if (block[1] !== undefined) {
      label = oneLine(stripTags(decodeEntities(block[1])));
      continue;
    }
    const bullets = [...block[2]!.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((b) => oneLine(stripTags(decodeEntities(b[1] ?? ""))))
      .filter((b) => b.length > 0);
    if (bullets.length === 0) continue;
    sections.push({ title: label || "Notes", bullets });
    label = "";
  }

  return sections;
}

/**
 * Normalizes a published date to an ISO calendar date. The appcast carries an
 * RFC-1123 `pubDate`, the archive a plain `2026-09-06`.
 *
 * The day is taken at the timestamp's own offset, not in UTC: a release
 * published 23:29 -0400 is dated the 2nd, and reading it as UTC would move it
 * to the 3rd.
 */
export function isoDateOrNull(raw: string | null): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const offset = /([+-])(\d{2}):?(\d{2})$/.exec(value);
  const offsetMinutes = offset
    ? (offset[1] === "-" ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3]))
    : 0;
  return new Date(parsed.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

function toAppRelease(release: AppcastRelease | ArchivedReleaseShape): AppRelease {
  return {
    version: release.version,
    build: "build" in release ? release.build : null,
    date: isoDateOrNull(release.date),
    sections: sectionsFromHtml(release.notesHtml)
  };
}

/** The archive carries no build number; this is that shape without it. */
type ArchivedReleaseShape = {
  version: string;
  date: string;
  notesHtml: string;
};

/**
 * Notes the appcast lost, filled from the archive.
 *
 * An item with no notes renders as a version header over a blank row, in the
 * app and on /changelog alike. That is not hypothetical: Sparkle rebuilds every
 * item from its DMG and removes the description of one whose DMG carries no
 * notes file, so 0.8.0 and 0.7.0 published with notes and reached both
 * surfaces with none (NOOK-304).
 *
 * The archive copy is used only where the live one is missing. Where both
 * exist the published item wins, because that is the text the updater itself
 * showed, and it carries the build number the archive does not have.
 */
export function withArchivedNotes<
  T extends { version: string; notesHtml: string }
>(
  live: readonly T[],
  archived: readonly { version: string; notesHtml: string }[]
): T[] {
  const notesByVersion = new Map(archived.map((r) => [r.version, r.notesHtml]));
  return live.map((release) => {
    if (release.notesHtml.trim()) return release;
    const fallback = notesByVersion.get(release.version);
    return fallback ? { ...release, notesHtml: fallback } : release;
  });
}

/**
 * Live releases first, newest first, then any archived release the appcast no
 * longer lists. Order is concatenation rather than a sort because both inputs
 * are newest-first and the archive only ever holds older releases — and because
 * /changelog renders this same list, the page and this feed cannot disagree
 * about what a release said.
 */
export function mergeReleases(
  live: readonly AppcastRelease[],
  archived: readonly ArchivedReleaseShape[]
): AppRelease[] {
  const releases = withArchivedNotes(live, archived).map(toAppRelease);
  const seen = new Set(releases.map((r) => r.version));
  for (const release of archived) {
    if (seen.has(release.version)) continue;
    releases.push(toAppRelease(release));
  }
  return releases;
}

/**
 * Everything the in-app changelog shows. Throws when the appcast cannot be
 * read — the caller must not serve an archived-only list as if it were
 * current, since the app then still has the newest release in its own bundle.
 */
export async function collectReleases(): Promise<AppRelease[]> {
  return mergeReleases(await fetchAppcastReleases(), ARCHIVED_RELEASES);
}
