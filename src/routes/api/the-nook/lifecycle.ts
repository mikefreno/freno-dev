import type { APIEvent } from "@solidjs/start/server";
import { env } from "~/env/server";
import { NookConnectionFactory } from "~/server/db-connections";
import { nookSchemaBootstrap } from "~/server/nook";
import {
  emailTrialReminder,
  emailTestimonialAsk,
  emailReviewAsk
} from "~/server/nook-lifecycle";
import { json } from "./_lib";

/**
 * GET /api/the-nook/lifecycle — daily Vercel cron.
 *
 * Runs the scheduled half of the two lifecycle emails:
 *   - trials with an email and no reminder yet, aged ≥ 11 days → D+11 expiry
 *     reminder (skipped when that same address already bought a license)
 *   - licenses aged ≥ 3 days → testimonial ask
 *   - licenses aged ≥ 14 days → review ask
 *
 * Each row is marked *before* its send is attempted (best-effort, logged on
 * failure), so a retry never double-sends; the purchase thank-you itself is
 * sent from the Stripe webhook at purchase time. Auth: `Authorization:
 * Bearer <secret>` where the secret is NOOK_LIFECYCLE_SECRET or Vercel's
 * CRON_SECRET — an unauthenticated trigger could re-email real users, so an
 * unconfigured secret fails closed.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function ageDays(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / DAY_MS : -1;
}

async function runLifecycle(): Promise<{
  reminders: number;
  testimonials: number;
  reviews: number;
}> {
  await nookSchemaBootstrap;
  const conn = NookConnectionFactory();
  const counts = { reminders: 0, testimonials: 0, reviews: 0 };

  // ── Trial D+11 reminder ────────────────────────────────────────────────
  const trials = await conn.execute(
    `SELECT fingerprint, email, started_at FROM trials
     WHERE email IS NOT NULL AND reminder_sent_at IS NULL`
  );
  for (const row of trials.rows as {
    fingerprint: string;
    email: string;
    started_at: string;
  }[]) {
    if (ageDays(row.started_at) < 11) continue;
    // Claim-then-send: the conditional UPDATE wins exactly once even when
    // two invocations race (cron + manual hit) — the loser sees
    // rowsAffected 0 and never sends. An unconditional mark-then-send let
    // both invocations pass the SELECT and mail the same user twice.
    const claim = await conn.execute({
      sql: `
        UPDATE trials SET reminder_sent_at = ?
        WHERE fingerprint = ? AND reminder_sent_at IS NULL
      `,
      args: [new Date().toISOString(), row.fingerprint]
    });
    if (claim.rowsAffected === 0) continue;
    // A trial that ended in a purchase gets no buy reminder. The address
    // comparison is on the raw stored values; both writes lowercase.
    const owned = await conn.execute({
      sql: "SELECT 1 FROM licenses WHERE lower(email) = lower(?) LIMIT 1",
      args: [row.email]
    });
    if (owned.rows.length > 0) continue;
    if (await emailTrialReminder(row.email)) counts.reminders++;
  }

  // ── Purchase D+3 testimonial ask / D+14 review ask ────────────────────
  const licenses = await conn.execute(
    `SELECT id, email, created_at, testimonial_asked_at, review_asked_at
     FROM licenses WHERE revoked = 0`
  );
  for (const row of licenses.rows as {
    id: string;
    email: string;
    created_at: string;
    testimonial_asked_at: string | null;
    review_asked_at: string | null;
  }[]) {
    const age = ageDays(row.created_at);
    if (age < 0) continue;

    if (age >= 3 && !row.testimonial_asked_at) {
      const claim = await conn.execute({
        sql: `
          UPDATE licenses SET testimonial_asked_at = ?
          WHERE id = ? AND testimonial_asked_at IS NULL
        `,
        args: [new Date().toISOString(), row.id]
      });
      if (claim.rowsAffected === 0) continue;
      if (await emailTestimonialAsk(row.email)) counts.testimonials++;
    }

    if (age >= 14 && !row.review_asked_at) {
      const claim = await conn.execute({
        sql: `
          UPDATE licenses SET review_asked_at = ?
          WHERE id = ? AND review_asked_at IS NULL
        `,
        args: [new Date().toISOString(), row.id]
      });
      if (claim.rowsAffected === 0) continue;
      if (await emailReviewAsk(row.email)) counts.reviews++;
    }
  }

  return counts;
}

export async function GET(event: APIEvent) {
  const auth = event.request.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim();
  const secret = env.NOOK_LIFECYCLE_SECRET ?? env.CRON_SECRET;
  if (!secret || !provided || provided !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const counts = await runLifecycle();
    return json({ success: true, ...counts });
  } catch (error) {
    console.error("Lifecycle job failed:", error);
    return json({ error: "Lifecycle job failed" }, 500);
  }
}
