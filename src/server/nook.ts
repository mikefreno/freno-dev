import { NookConnectionFactory } from "~/server/db-connections";
import { env } from "~/env/server";
import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

/**
 * The Nook license schema + issueLicense helper.
 *
 * Kept out of `database.ts` to avoid circular imports: this module owns the
 * dedicated The Nook Turso DB and the Ed25519 license-key signing. The schema
 * is bootstrapped idempotently (CREATE TABLE IF NOT EXISTS) so no migration
 * tool is needed.
 *
 * The license key is a compact printable string:
 *
 *   key = payloadJson + "." + base64url(ed25519-signature(payloadJson))
 *
 * Canonicalization is load-bearing. The Swift client verifies the EXACT
 * payload bytes (the substring before the last "."), never a re-serialization
 * of the decoded JSON — key order must stay stable. Without a compact,
 * deterministic payload this breaks, so `issueLicense` builds the payload as
 * a hand-ordered literal and `JSON.stringify`s it in place.
 */

interface IssueLicenseResult {
  key: string;
  id: string;
}

const PAYLOAD_VERSION = 1;

export const nookSchemaBootstrap: Promise<unknown> = (async () => {
  const conn = NookConnectionFactory();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS licenses (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      max_devices INTEGER NOT NULL DEFAULT 3
    )
  `);
  const licenseCols = await conn.execute(`PRAGMA table_info(licenses)`);
  const hasMaxDevices = licenseCols.rows.some(
    (r) => (r as { name?: string }).name === "max_devices"
  );
  if (!hasMaxDevices) {
    await conn.execute(
      `ALTER TABLE licenses ADD COLUMN max_devices INTEGER NOT NULL DEFAULT 3`
    );
  }
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS activations (
      id TEXT PRIMARY KEY,
      license_id TEXT NOT NULL REFERENCES licenses(id),
      device_fingerprint TEXT NOT NULL,
      device_name TEXT NOT NULL,
      activated_at TEXT NOT NULL,
      deactivated_at TEXT
    )
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS trials (
      fingerprint TEXT PRIMARY KEY,
      started_at TEXT NOT NULL
    )
  `);
})();

function privateKeyObject() {
  return createPrivateKey({
    key: Buffer.from(env.NOOK_LICENSE_PRIVATE_KEY, "base64"),
    format: "der",
    type: "pkcs8"
  });
}

function signPayload(payload: string): string {
  const signature = sign(null, Buffer.from(payload, "utf8"), privateKeyObject());
  return Buffer.from(signature).toString("base64url");
}

/** Re-verifies a license key's Ed25519 signature server-side (defense in depth). */
export function verifyLicenseKey(key: string): boolean {
  const token = key.match(/^([^]*?)\.([A-Za-z0-9_-]+)$/);
  if (!token) return false;
  const [, payload, sigB64] = token;
  const publicKey = createPublicKey(privateKeyObject());
  let signature: Buffer;
  try {
    signature = Buffer.from(sigB64!, "base64url");
  } catch {
    return false;
  }
  return verify(null, Buffer.from(payload!, "utf8"), publicKey, signature);
}

/**
 * Signs and stores a license row. Purchase licenses cap at 3 devices; gift
 * licenses (via `grantLicense`) cap at 1 unless overridden.
 */
async function insertLicense(
  email: string,
  stripeSessionId: string,
  maxDevices: number
): Promise<IssueLicenseResult> {
  const id = crypto.randomUUID();
  const payload = JSON.stringify({
    v: PAYLOAD_VERSION,
    lid: id,
    email: email,
    iat: Math.floor(Date.now() / 1000)
  });
  const key = `${payload}.${signPayload(payload)}`;
  await NookConnectionFactory().execute({
    sql: `INSERT INTO licenses (id, key, email, stripe_session_id, created_at, revoked, max_devices)
          VALUES (?, ?, ?, ?, ?, 0, ?)`,
    args: [id, key, email, stripeSessionId, new Date().toISOString(), maxDevices]
  });
  return { key, id };
}

/**
 * Issues a license key for a completed Stripe checkout session (3 devices).
 *
 * Caller is responsible for the uniqueness/idempotency of `stripeSessionId`
 * (the `licenses.stripe_session_id` column is UNIQUE; the webhook catches the
 * conflict and skips re-emailing).
 */
export async function issueLicense(
  email: string,
  stripeSessionId: string
): Promise<IssueLicenseResult> {
  return insertLicense(email, stripeSessionId, 3);
}

/**
 * Mints a free license outside the Stripe flow (gifting / comps).
 *
 * `stripe_session_id` holds a `gift:<uuid>` sentinel so the UNIQUE NOT NULL
 * constraint is satisfied. Defaults to a 1-device cap.
 */
export async function grantLicense(
  email: string,
  maxDevices = 1
): Promise<IssueLicenseResult> {
  return insertLicense(email, `gift:${crypto.randomUUID()}`, maxDevices);
}
