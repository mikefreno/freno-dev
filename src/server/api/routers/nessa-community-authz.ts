import { TRPCError } from "@trpc/server";

/**
 * Community authorization helpers (p8-003).
 *
 * Membership gating for `nessaCommunityRouter`. Extracted into a dependency-
 * free module (no `~/env/server` import) so it can be unit-tested directly
 * against an in-memory SQLite connection without booting the SSR-guarded env
 * chain, and so every membership-gated endpoint shares ONE implementation of
 * each check (no ad-hoc duplicated SQL).
 *
 * Contract mirrors the libsql client the router uses: a connection exposes
 * `execute({ sql, args }) -> { rows }`.
 */

/** Minimal libsql-shaped connection surface used by community authz. */
export interface NessaConn {
  execute: (q: {
    sql: string;
    args?: (string | number | null)[];
  }) => Promise<{ rows: unknown[] }>;
}

/**
 * Require that the calling user is a member of the club (or is the owner).
 *
 * Throws `TRPCError({ code: "FORBIDDEN", message: "Not a member of this club" })`
 * on miss and returns void on success. This is the single source of truth for
 * "is this user allowed to touch this club's content" — every membership-gated
 * endpoint in `nessa-community.ts` MUST route through this helper.
 */
export async function requireClubMembership(
  conn: NessaConn,
  clubId: string,
  userId: string
): Promise<void> {
  const result = await conn.execute({
    sql: "SELECT id FROM clubMemberships WHERE clubId = ? AND userId = ?",
    args: [clubId, userId]
  });
  if (!result.rows.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this club"
    });
  }
}

/**
 * Resolve the clubId that owns a post. Returns the owning club's id, or
 * throws `NOT_FOUND` if the post does not exist. Used by read/interaction
 * endpoints (`getPost`, `addComment`, `comments`, `like`, `unlike`) to derive
 * the club a target post belongs to before gating on membership.
 */
export async function resolveClubIdFromPost(
  conn: NessaConn,
  postId: string
): Promise<string> {
  const result = await conn.execute({
    sql: "SELECT clubId FROM clubPosts WHERE id = ?",
    args: [postId]
  });
  if (!result.rows.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
  }
  return (result.rows[0] as unknown as { clubId: string }).clubId;
}

/**
 * Resolve the clubId that owns a challenge. Returns the owning club's id, or
 * throws `NOT_FOUND` if the challenge does not exist. Used by challenge
 * interaction endpoints (`challenges.leave`, `challenges.submitProgress`) to
 * derive the club a challenge belongs to before gating on membership.
 */
export async function resolveClubIdFromChallenge(
  conn: NessaConn,
  challengeId: string
): Promise<string> {
  const result = await conn.execute({
    sql: "SELECT clubId FROM clubChallenges WHERE id = ?",
    args: [challengeId]
  });
  if (!result.rows.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Challenge not found"
    });
  }
  return (result.rows[0] as unknown as { clubId: string }).clubId;
}
