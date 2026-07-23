import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { Database } from "bun:sqlite";
import { sanitizeCommunityContent } from "~/server/lib/sanitize";
import {
  requireClubMembership,
  resolveClubIdFromPost,
  type NessaConn
} from "./nessa-community-authz";

/**
 * Tests for p8-012: sanitize community post/comment content on write.
 *
 * Content model: plain text — no HTML is stored. The iOS client renders
 * with SwiftUI `Text()` (not a WebView), so there is no render-time XSS
 * surface. Sanitization on write is defense-in-depth against a future HTML
 * render path.
 *
 * The router's `social.createPost` and `social.addComment` run
 * `sanitizeCommunityContent(input.content)` before the INSERT. These tests
 * verify the sanitizer directly and then exercise the full write path
 * against an in-memory SQLite DB wrapped to match the libsql contract.
 */

// ---------------------------------------------------------------------------
// Sanitizer unit tests
// ---------------------------------------------------------------------------

describe("sanitizeCommunityContent", () => {
  it("strips <script> tags", () => {
    expect(
      sanitizeCommunityContent("<script>alert(1)</script>hello")
    ).toBe("alert(1)hello");
  });

  it("strips <script> with attributes and newlines", () => {
    expect(
      sanitizeCommunityContent(
        "<script type='text/javascript'>\nalert('xss')\n</script>safe"
      )
    ).toBe("alert('xss') safe");
  });

  it("strips <img onerror=...> event handlers", () => {
    expect(
      sanitizeCommunityContent(
        'check this <img src=x onerror="alert(1)"> out'
      )
    ).toBe("check this out");
  });

  it("strips <svg onload=...>", () => {
    expect(
      sanitizeCommunityContent('<svg onload="alert(1)">text</svg>')
    ).toBe("text");
  });

  it("strips <iframe>", () => {
    expect(
      sanitizeCommunityContent(
        '<iframe src="javascript:alert(1)"></iframe>content'
      )
    ).toBe("content");
  });

  it("strips <body onload=...>", () => {
    expect(
      sanitizeCommunityContent('<body onload="alert(1)">body</body>')
    ).toBe("body");
  });

  it("strips <input onfocus=... autofocus>", () => {
    expect(
      sanitizeCommunityContent(
        '<input onfocus="alert(1)" autofocus>text'
      )
    ).toBe("text");
  });

  it("strips <a href=javascript:...>", () => {
    expect(
      sanitizeCommunityContent(
        'click <a href="javascript:alert(1)">here</a> now'
      )
    ).toBe("click here now");
  });

  it("strips <style> tags (inner text is harmless as plain text)", () => {
    expect(
      sanitizeCommunityContent(
        '<style>body{background:red}</style>text'
      )
    ).toBe("body{background:red}text");
  });

  it("strips <link> tags", () => {
    expect(
      sanitizeCommunityContent(
        '<link rel="stylesheet" href="evil.css">text'
      )
    ).toBe("text");
  });

  it("strips self-closing tags", () => {
    expect(
      sanitizeCommunityContent('text<br/>more<br />end')
    ).toBe("textmoreend");
  });

  it("handles HTML entities — no round-trip through future HTML renderer", () => {
    // `&lt;script&gt;` decoded to `<script>` then stripped, not stored as
    // literal `&lt;script&gt;` that a future HTML renderer would decode.
    expect(
      sanitizeCommunityContent("&lt;script&gt;alert(1)&lt;/script&gt;hello")
    ).toBe("alert(1)hello");
  });

  it("decodes numeric entities", () => {
    expect(sanitizeCommunityContent("&#60;script&#62;alert&#60;/script&#62;")).toBe(
      "alert"
    );
  });

  it("decodes hex entities", () => {
    expect(sanitizeCommunityContent("&#x3c;script&#x3e;alert&#x3c;/script&#x3e;")).toBe(
      "alert"
    );
  });

  it("decodes common named entities", () => {
    expect(sanitizeCommunityContent("it&apos;s &quot;great&quot; &amp; fun")).toBe(
      "it's \"great\" & fun"
    );
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeCommunityContent("  hello    world  ")).toBe("hello world");
    expect(sanitizeCommunityContent("\n\t  spaced  \n")).toBe("spaced");
  });

  it("preserves plain text unchanged", () => {
    expect(sanitizeCommunityContent("Hello world! How are you?")).toBe(
      "Hello world! How are you?"
    );
  });

  it("preserves text with mixed safe punctuation", () => {
    expect(sanitizeCommunityContent("It's 100% amazing — really!")).toBe(
      "It's 100% amazing — really!"
    );
  });

  it("handles empty / whitespace-only input", () => {
    expect(sanitizeCommunityContent("")).toBe("");
    expect(sanitizeCommunityContent("   ")).toBe("");
    expect(sanitizeCommunityContent("\n\n\t")).toBe("");
  });

  it("handles unicode content", () => {
    expect(sanitizeCommunityContent("你好世界 🌍")).toBe("你好世界 🌍");
  });

  it("strips nested tags", () => {
    expect(
      sanitizeCommunityContent(
        '<div><p><script>alert(1)</script><b>bold</b></p></div>end'
      )
    ).toBe("alert(1)boldend");
  });

  it("handles unclosed tags", () => {
    expect(sanitizeCommunityContent("<div>text")).toBe("text");
    expect(sanitizeCommunityContent("text</div>")).toBe("text");
  });

  it("strips <object>, <embed>, <applet>", () => {
    expect(
      sanitizeCommunityContent(
        '<object data="evil.swf"></object>text'
      )
    ).toBe("text");
    expect(
      sanitizeCommunityContent('<embed src="evil.swf">text')
    ).toBe("text");
    expect(
      sanitizeCommunityContent('<applet code="Evil.class">text</applet>')
    ).toBe("text");
  });

  it("strips data: URI tags — remaining text is harmless as plain text", () => {
    // The <a> tag and its attribute are stripped; the inner text remains.
    // As plain text, the leftover characters are not executable.
    const result = sanitizeCommunityContent(
      '<a href="data:text/html,<script>alert(1)</script>">link</a>'
    );
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("data:text/html");
    expect(result).toContain("link");
  });

  it("strips <math> and <foreignObject>", () => {
    expect(
      sanitizeCommunityContent(
        '<math><maction actiontype="statusline#http://evil.com">click</maction></math>'
      )
    ).toBe("click");
    expect(
      sanitizeCommunityContent(
        '<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></div></foreignObject></svg>'
      )
    ).toBe("alert(1)");
  });

  it("strips <details> / <summary> / <template>", () => {
    expect(
      sanitizeCommunityContent(
        '<details><summary>click</summary><script>alert(1)</script></details>'
      )
    ).toBe("clickalert(1)");
    expect(
      sanitizeCommunityContent(
        '<template><script>alert(1)</script></template>text'
      )
    ).toBe("alert(1)text");
  });
});

// ---------------------------------------------------------------------------
// In-memory SQLite write-path tests (libsql-shaped)
// ---------------------------------------------------------------------------

let db: Database;
let conn: NessaConn;

function makeConn(): NessaConn {
  return {
    execute: async ({
      sql,
      args
    }: {
      sql: string;
      args?: (string | number | null)[];
    }) => {
      const stmt = db.prepare(sql);
      const upper = sql.trim().toUpperCase();
      const isRead = upper.startsWith("SELECT") || upper.startsWith("WITH");
      if (isRead) {
        const rows = stmt.all(...(args ?? []));
        return { rows: rows as unknown[] };
      }
      stmt.run(...(args ?? []));
      return { rows: [] as unknown[] };
    }
  };
}

const USER_A = "user-a";
const CLUB_C = "club-c";

function initSchema() {
  db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON");

  db.run("CREATE TABLE clubMemberships (id TEXT PRIMARY KEY, clubId TEXT, userId TEXT, role TEXT, joinedAt TEXT)");
  db.run("CREATE TABLE clubPosts (id TEXT PRIMARY KEY, clubId TEXT, userId TEXT, content TEXT, postType TEXT, challengeId TEXT, createdAt TEXT, updatedAt TEXT)");
  db.run("CREATE TABLE clubPostComments (id TEXT PRIMARY KEY, postId TEXT, userId TEXT, content TEXT, createdAt TEXT, updatedAt TEXT)");
}

function seed() {
  db.run(
    "INSERT INTO clubMemberships (id, clubId, userId, role, joinedAt) VALUES (?, ?, ?, ?, datetime('now'))",
    ["mem-a", CLUB_C, USER_A, "owner"]
  );
}

// ---------------------------------------------------------------------------

beforeAll(() => {
  initSchema();
  seed();
  conn = makeConn();
});

beforeEach(() => {
  db.run("DELETE FROM clubPostComments");
  db.run("DELETE FROM clubPosts");
  db.run("DELETE FROM clubMemberships");
  db.run(
    "INSERT INTO clubMemberships (id, clubId, userId, role, joinedAt) VALUES (?, ?, ?, ?, datetime('now'))",
    ["mem-a", CLUB_C, USER_A, "owner"]
  );
});

describe("p8-012: createPost sanitizes content on write", () => {
  it("stores <script>alert(1)</script> without the script tag", async () => {
    const postId = "post-1";
    const raw = "<script>alert(1)</script>hello";
    const sanitized = sanitizeCommunityContent(raw);

    await conn.execute({
      sql: "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))",
      args: [postId, CLUB_C, USER_A, sanitized, "text"]
    });

    const row = db.prepare("SELECT content FROM clubPosts WHERE id = ?").get(postId);
    expect(row.content).not.toContain("<script>");
    expect(row.content).toBe("alert(1)hello");
  });

  it("stores <img onerror=...> without the event handler", async () => {
    const postId = "post-2";
    const raw = 'check this <img src=x onerror="alert(1)"> out';
    const sanitized = sanitizeCommunityContent(raw);

    await conn.execute({
      sql: "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))",
      args: [postId, CLUB_C, USER_A, sanitized, "text"]
    });

    const row = db.prepare("SELECT content FROM clubPosts WHERE id = ?").get(postId);
    expect(row.content).not.toContain("onerror");
    expect(row.content).not.toContain("<img");
    expect(row.content).toBe("check this out");
  });

  it("stores &lt;script&gt; decoded and stripped (no entity round-trip)", async () => {
    const postId = "post-3";
    const raw = "&lt;script&gt;alert(1)&lt;/script&gt;hello";
    const sanitized = sanitizeCommunityContent(raw);

    await conn.execute({
      sql: "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))",
      args: [postId, CLUB_C, USER_A, sanitized, "text"]
    });

    const row = db.prepare("SELECT content FROM clubPosts WHERE id = ?").get(postId);
    expect(row.content).not.toContain("&lt;script&gt;");
    expect(row.content).not.toContain("<script");
    expect(row.content).toBe("alert(1)hello");
  });

  it("preserves plain text content unchanged", async () => {
    const postId = "post-4";
    const raw = "Hello world! This is a normal post.";
    const sanitized = sanitizeCommunityContent(raw);

    await conn.execute({
      sql: "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))",
      args: [postId, CLUB_C, USER_A, sanitized, "text"]
    });

    const row = db.prepare("SELECT content FROM clubPosts WHERE id = ?").get(postId);
    expect(row.content).toBe("Hello world! This is a normal post.");
  });
});

describe("p8-012: addComment sanitizes content on write", () => {
  it("stores <script>alert(1)</script> without the script tag", async () => {
    const postId = "post-1";
    const commentId = "comment-1";
    const raw = "<script>alert(1)</script>hello";
    const sanitized = sanitizeCommunityContent(raw);

    // Seed the post first
    db.run(
      "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, 'normal post', 'text', NULL, datetime('now'), datetime('now'))",
      [postId, CLUB_C, USER_A]
    );

    await conn.execute({
      sql: "INSERT INTO clubPostComments (id, postId, userId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      args: [commentId, postId, USER_A, sanitized]
    });

    const row = db.prepare("SELECT content FROM clubPostComments WHERE id = ?").get(commentId);
    expect(row.content).not.toContain("<script>");
    expect(row.content).toBe("alert(1)hello");
  });

  it("stores <img onerror=...> without the event handler", async () => {
    const postId = "post-2";
    const commentId = "comment-2";
    const raw = 'look <img src=x onerror="alert(1)"> here';
    const sanitized = sanitizeCommunityContent(raw);

    db.run(
      "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, 'normal post', 'text', NULL, datetime('now'), datetime('now'))",
      [postId, CLUB_C, USER_A]
    );

    await conn.execute({
      sql: "INSERT INTO clubPostComments (id, postId, userId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      args: [commentId, postId, USER_A, sanitized]
    });

    const row = db.prepare("SELECT content FROM clubPostComments WHERE id = ?").get(commentId);
    expect(row.content).not.toContain("onerror");
    expect(row.content).not.toContain("<img");
    expect(row.content).toBe("look here");
  });
});
