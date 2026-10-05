import { env } from "~/env/server";

/**
 * The two lifecycle emails (plus their scheduled follow-ups) for The Nook —
 * the highest-ROI-per-hour writing in the whole plan, per
 * the-nook/docs/marketing-strategy.md §4.4:
 *
 *   (a) trial D+11 expiry reminder with a buy link (scheduled, see
 *       /api/the-nook/lifecycle)
 *   (b) purchase thank-you, sent at purchase, promising a testimonial ask at
 *       D+3 and a review ask at D+14 (also scheduled from the same job)
 *
 * All sends are best-effort: failures are logged, never thrown — an email
 * outage must never fail a purchase webhook or a cron run. Copy follows
 * marketing/positioning.md: category nouns, no competitor names, honest
 * privacy scoping.
 */

const SENDER = { name: "The Nook", email: "support@freno.me" };
const CHECKOUT_URL = "https://nook.freno.me/checkout";

/** Sends one plain-text email via the Brevo SMTP API. Best-effort. */
async function send(to: string, subject: string, textContent: string): Promise<boolean> {
  if (!env.SENDINBLUE_KEY) {
    console.error("Lifecycle email skipped — SENDINBLUE_KEY unset:", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.SENDINBLUE_KEY,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: SENDER,
        replyTo: SENDER,
        to: [{ email: to }],
        subject,
        textContent
      })
    });
    if (!res.ok) {
      console.error(`Lifecycle email "${subject}" to ${to}: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Lifecycle email "${subject}" to ${to} failed:`, error);
    return false;
  }
}

/** (a) Trial D+11: the expiry reminder with a buy link. */
export function emailTrialReminder(to: string): Promise<boolean> {
  return send(
    to,
    "Your Nook trial ends in 3 days",
    `Hi,\n\nYour Nook trial ends in about three days.\n\n` +
      `If it's been keeping your agents unblocked and your Mac cool, you can ` +
      `keep it with a one-time purchase — no subscription:\n\n${CHECKOUT_URL}\n\n` +
      `If it's not for you, no action needed — the trial just ends and nothing ` +
      `is charged. Either way, thanks for trying it.\n\n` +
      `— Mike, The Nook`
  );
}

/** (b) Purchase thank-you, sent immediately at purchase. */
export function emailThankYou(to: string): Promise<boolean> {
  return send(
    to,
    "Welcome to The Nook",
    `Hi,\n\nThank you for buying The Nook — your license key just arrived in a ` +
      `separate email.\n\n` +
      `Two small things to expect from me, nothing more: in a few days I'll ` +
      `ask how it's going, and later I'll ask if you'd share a line about it. ` +
      `That's the whole newsletter.\n\n` +
      `If anything is off — activation, a hook that won't fire, anything — ` +
      `just reply to this email.\n\n— Mike, The Nook`
  );
}

/** (b1) Purchase D+3: the testimonial ask. */
export function emailTestimonialAsk(to: string): Promise<boolean> {
  return send(
    to,
    "How is The Nook going for you?",
    `Hi,\n\nYou've had The Nook for a few days now. How is it going?\n\n` +
      `If it's earned its place, reply with a line or two about what it does ` +
      `for you — with your permission, and only with it, I'd love to share ` +
      `your words on the site.\n\n` +
      `If something is in the way, reply with that instead: it's a faster fix ` +
      `than you'd think.\n\n— Mike, The Nook`
  );
}

/** (b2) Purchase D+14: the review ask. */
export function emailReviewAsk(to: string): Promise<boolean> {
  return send(
    to,
    "Two weeks in — would you share a line?",
    `Hi,\n\nTwo weeks with The Nook. If it's doing its job, would you share a ` +
      `sentence about it? A reply is fine — with your name (or handle) and ` +
      `what setup you run, it helps other people with a dozen agents decide.\n\n` +
      `Thank you either way.\n\n— Mike, The Nook`
  );
}
