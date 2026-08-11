// ───────────────────────────────────────────────────────────────────────
// Nessa auth — Clerk session JWT verification (RS256 / JWKS)
//
// Migrated from self-signed HS256 tokens to Clerk session token
// verification.  Incoming `Authorization: Bearer <token>` headers are
// verified against Clerk's JWKS endpoint via `@clerk/backend`.
//
// Public API is unchanged so callers need not be modified:
//   * verifyNessaToken(token) → { sub, exp?, iat? }
//   * NessaAuthPayload type
//
// signNessaToken was removed — the frontend now supplies Clerk session
// tokens directly; the backend only verifies.
// ───────────────────────────────────────────────────────────────────────

import { verifyToken } from "@clerk/backend";
import { env } from "~/env/server";

export type NessaAuthPayload = {
  sub: string; // Clerk user id
  exp?: number;
  iat?: number;
};

/**
 * Verify a Clerk session JWT and return the subject (user id).
 *
 * Uses the Clerk Backend API secret key to fetch the JWKS and verify the
 * RS256 signature.  Rejects expired, malformed, or improperly signed tokens.
 */
export async function verifyNessaToken(
  token: string
): Promise<NessaAuthPayload> {
  const payload = await verifyToken(token, {
    secretKey: env.NESSA_CLERK_SECRET,
  });

  if (!payload.sub) {
    throw new Error("Missing subject in Clerk session token");
  }

  return {
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
  };
}
