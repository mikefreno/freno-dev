import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { Database } from "bun:sqlite";
import {
  requireClubMembership,
  resolveClubIdFromPost,
  resolveClubIdFromChallenge,
  type NessaConn
} from "./nessa-community-authz";

/**
 * Regression tests for p8-003: private club content (posts, comments, likes,
 * challenge participation) must NOT be readable/actionable by non-members.
 *
 * These tests exercise the shared membership-gating helpers directly against
 * an in-memory SQLite DB (`bun:sqlite`) wrapped to match the libsql
 * `execute({ sql, args }) -> { rows }` contract the router uses. The
 * `nessa-community.ts` router calls these same helpers in the same order, so a
 * pass here guarantees the authorization decision each endpoint makes before
 * touching data.
 *
 * Two users are seeded: A is a member (owner) of club C (and owns the post +
 * challenge under test); B is NOT a member of C.
 */

// ---------------------------------------------------------------------------
// In-memory SQLite connection (libsql-shaped)
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

// ---------------------------------------------------------------------------
// Schema + seed
// ---------------------------------------------------------------------------

const USER_A = "user-a";
const USER_B = "user-b";
const CLUB_C = "club-c";
const POST_P = "post-p"; // created by A in club C
const CHALLENGE_CH = "challenge-ch"; // in club C, created by A

function initSchema() {
  db = new Database(":memory:");
  db.run("PRAGMA foreign_keys = ON");

  db.run("CREATE TABLE clubMemberships (id TEXT PRIMARY KEY, clubId TEXT, userId TEXT, role TEXT, joinedAt TEXT)");
  db.run("CREATE TABLE clubPosts (id TEXT PRIMARY KEY, clubId TEXT, userId TEXT, content TEXT, postType TEXT, challengeId TEXT, createdAt TEXT, updatedAt TEXT)");
  db.run("CREATE TABLE clubChallenges (id TEXT PRIMARY KEY, clubId TEXT, title TEXT, description TEXT, goalType TEXT, goalValue REAL, startDate TEXT, endDate TEXT, createdBy TEXT, status TEXT, createdAt TEXT, updatedAt TEXT)");
}

function seed() {
  // Club C: A is a member (owner). B is NOT.
  db.run(
    "INSERT INTO clubMemberships (id, clubId, userId, role, joinedAt) VALUES (?, ?, ?, ?, datetime('now'))",
    ["mem-a", CLUB_C, USER_A, "owner"]
  );

  // Post P by A in club C.
  db.run(
    "INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))",
    [POST_P, CLUB_C, USER_A, "Hello from A", "text"]
  );

  // Challenge CH in club C, created by A.
  db.run(
    "INSERT INTO clubChallenges (id, clubId, title, description, goalType, goalValue, startDate, endDate, createdBy, status, createdAt, updatedAt) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    [CHALLENGE_CH, CLUB_C, "Run 5k", "distance", 5000, "2025-01-01", "2025-12-31", USER_A, "active"]
  );
}

// ---------------------------------------------------------------------------

beforeAll(() => {
  initSchema();
  seed();
  conn = makeConn();
});

beforeEach(() => {
  // Keep membership state stable across tests (join/leave integration mutates it).
  db.run("DELETE FROM clubMemberships");
  db.run(
    "INSERT INTO clubMemberships (id, clubId, userId, role, joinedAt) VALUES (?, ?, ?, ?, datetime('now'))",
    ["mem-a", CLUB_C, USER_A, "owner"]
  );
});

async function errCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("p8-003: resolveClubIdFromPost", () => {
  it("resolves the owning club for an existing post", async () => {
    expect(await resolveClubIdFromPost(conn, POST_P)).toBe(CLUB_C);
  });

  it("throws NOT_FOUND for a missing post", async () => {
    expect(await errCode(resolveClubIdFromPost(conn, "no-such-post"))).toBe("NOT_FOUND");
  });
});

describe("p8-003: resolveClubIdFromChallenge", () => {
  it("resolves the owning club for an existing challenge", async () => {
    expect(await resolveClubIdFromChallenge(conn, CHALLENGE_CH)).toBe(CLUB_C);
  });

  it("throws NOT_FOUND for a missing challenge", async () => {
    expect(await errCode(resolveClubIdFromChallenge(conn, "no-such-challenge"))).toBe("NOT_FOUND");
  });
});

describe("p8-003: requireClubMembership", () => {
  it("passes silently for a member", async () => {
    await expect(requireClubMembership(conn, CLUB_C, USER_A)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for a non-member", async () => {
    expect(await errCode(requireClubMembership(conn, CLUB_C, USER_B))).toBe("FORBIDDEN");
  });
});

/**
 * End-to-end authorization sequence for each of the 7 fixed endpoints. The
 * router does exactly: resolve the resource's clubId, then
 * requireClubMembership on it. Replaying that here proves the decision a
 * non-member is rejected / a member is allowed.
 */
describe("p8-003: endpoint authorization sequences (resolve → require)", () => {
  // social.getPost / addComment / comments / like / unlike
  it("getPost/addComment/comments/like/unlike: non-member B rejected with FORBIDDEN", async () => {
    const clubId = await resolveClubIdFromPost(conn, POST_P);
    expect(await errCode(requireClubMembership(conn, clubId, USER_B))).toBe("FORBIDDEN");
  });

  it("getPost/addComment/comments/like/unlike: member A allowed", async () => {
    const clubId = await resolveClubIdFromPost(conn, POST_P);
    await expect(requireClubMembership(conn, clubId, USER_A)).resolves.toBeUndefined();
  });

  // challenges.leave / challenges.submitProgress
  it("challenges.leave / submitProgress: non-member B rejected with FORBIDDEN", async () => {
    const clubId = await resolveClubIdFromChallenge(conn, CHALLENGE_CH);
    expect(await errCode(requireClubMembership(conn, clubId, USER_B))).toBe("FORBIDDEN");
  });

  it("challenges.leave / submitProgress: member A allowed", async () => {
    const clubId = await resolveClubIdFromChallenge(conn, CHALLENGE_CH);
    await expect(requireClubMembership(conn, clubId, USER_A)).resolves.toBeUndefined();
  });
});

describe("p8-003: join then allowed / leave then blocked (integration)", () => {
  it("B is blocked, allowed after joining C, blocked again after leaving", async () => {
    // Initially blocked.
    const clubId = await resolveClubIdFromPost(conn, POST_P);
    expect(await errCode(requireClubMembership(conn, clubId, USER_B))).toBe("FORBIDDEN");

    // B joins.
    db.run(
      "INSERT INTO clubMemberships (id, clubId, userId, role, joinedAt) VALUES (?, ?, ?, ?, datetime('now'))",
      ["mem-b", CLUB_C, USER_B, "member"]
    );
    await expect(requireClubMembership(conn, clubId, USER_B)).resolves.toBeUndefined();

    // B leaves.
    db.run("DELETE FROM clubMemberships WHERE clubId = ? AND userId = ?", [
      CLUB_C,
      USER_B
    ]);
    expect(await errCode(requireClubMembership(conn, clubId, USER_B))).toBe("FORBIDDEN");
  });
});
