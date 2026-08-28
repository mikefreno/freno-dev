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
 *   key = "NOOK-" + hyphen-grouped base32(payload || ed25519-signature)
 *
 * Payload layout (v1) is defined below in `buildPayload`. The Swift client
 * decodes the base32 and verifies the EXACT payload bytes against the
 * Ed25519 signature, so the layout and signing must stay stable.
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

const KEY_PREFIX = "NOOK-";
const SIGNATURE_LENGTH = 64;
const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// Binary license payload (v1), signed with Ed25519:
//   [0]      version  (1 byte)
//   [1..17)  lid      (16 bytes, UUID decoded)
//   [17..25) iat      (8 bytes, big-endian uint64)
//   [25]     emailLen (1 byte)
//   [26..)   email    (UTF-8)
// A key is a "NOOK-" prefixed, hyphen-grouped base32 of payload || 64-byte sig.

function uuidToBytes(uuid: string): Buffer | null {
  const hex = uuid.replace(/-/g, "");
  return /^[0-9a-fA-F]{32}$/.test(hex) ? Buffer.from(hex, "hex") : null;
}

function buildPayload(lid: string, email: string, iat: number): Buffer {
  const lidBytes = uuidToBytes(lid);
  if (!lidBytes) throw new Error("Invalid license id");
  const emailBytes = Buffer.from(email, "utf8");
  const header = Buffer.allocUnsafe(26);
  header[0] = PAYLOAD_VERSION;
  lidBytes.copy(header, 1);
  header.writeBigUInt64BE(BigInt(iat), 17);
  header[25] = emailBytes.length;
  return Buffer.concat([header, emailBytes]);
}

function base32Encode(data: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Buffer | null {
  const cleaned = input.trim().replace(/^NOOK-/i, "").replace(/[^A-Z2-7]/g, "");
  if (cleaned.length === 0) return null;
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function encodeKey(data: Buffer): string {
  const encoded = base32Encode(data);
  const groups: string[] = [];
  for (let i = 0; i < encoded.length; i += 5) groups.push(encoded.slice(i, i + 5));
  return `${KEY_PREFIX}${groups.join("-")}`;
}

/** Re-verifies a license key's Ed25519 signature server-side (defense in depth). */
export function verifyLicenseKey(key: string): boolean {
  const token = base32Decode(key);
  if (!token || token.length <= SIGNATURE_LENGTH) return false;
  const payload = token.subarray(0, token.length - SIGNATURE_LENGTH);
  if (payload[0] !== PAYLOAD_VERSION || payload.length < 27) return false;
  const signature = token.subarray(token.length - SIGNATURE_LENGTH);
  const publicKey = createPublicKey(privateKeyObject());
  return verify(null, payload as Buffer, publicKey, signature);
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
  const iat = Math.floor(Date.now() / 1000);
  const payload = buildPayload(id, email, iat);
  const signature = sign(null, payload, privateKeyObject());
  const key = encodeKey(Buffer.concat([payload, signature]));
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

/**
 * Sends a license key to the buyer. Best-effort — failures are logged, never
 * thrown, so the caller (checkout webhook / resend) isn't interrupted.
 */
export async function emailLicenseKey(to: string, licenseKey: string): Promise<void> {
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.SENDINBLUE_KEY,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: { name: "The Nook", email: "support@freno.me" },
        to: [{ email: to }],
        subject: "Your The Nook license key",
        textContent:
          `Your The Nook license key is:\n\n${licenseKey}\n\n` +
          `Open The Nook, go to Settings, and enter this key to activate.\n` +
          `You can activate up to 3 devices.\n\n— Michael`
      })
    });
  } catch (error) {
    console.error("Failed to email The Nook license key:", error);
  }
}
