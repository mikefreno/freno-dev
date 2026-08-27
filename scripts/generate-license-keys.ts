/**
 * One-shot The Nook license Ed25519 keypair generator.
 *
 * Run with: bun scripts/generate-license-keys.ts
 *
 * Prints:
 *   - The Ed25519 PRIVATE key as base64 PKCS8 DER  → NOOK_LICENSE_PRIVATE_KEY
 *     (freno-dev env).
 *   - The raw 32-byte Ed25519 public key (the X coordinate) as base64 SPKI DER
 *     suffix → compiled into the Swift `LicenseVerifier.PublicKeyConstant`.
 *
 * The private key lives ONLY in env — never in git.
 * Paste the public key into Sources/NookCore/Licensing/LicenseVerifier.swift
 * (step 4 of the distribution plan) after running this once.
 */
import { generateKeyPairSync, createPrivateKey } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

const privateKeyDer = privateKey.export({ format: "der", type: "pkcs8" });
const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" });

// Raw 32-byte X coordinate: tail of the SPKI DER public key.
const publicKeySpki = publicKey.export({ format: "der", type: "spki" });
const rawPublic = publicKeySpki.subarray(-32);

console.log("── The Nook license keypair ──────────────────────────────");
console.log("NOOK_LICENSE_PRIVATE_KEY (base64 PKCS8 DER):");
console.log(privateKeyDer.toString("base64"));
console.log("");
console.log("Private key PEM (reference, for license signing only):");
console.log(privateKeyPem);
console.log("");
console.log("LicenseVerifier public key base64 (raw 32-byte X, step 4):");
console.log(rawPublic.toString("base64"));
console.log("──────────────────────────────────────────────────────────");

// Sanity check: sign + verify round trip with the exported artifacts.
const publicKeyFromPem = createPrivateKey(privateKeyPem)
  .export({ format: "der", type: "pkcs8" });
if (Buffer.compare(Buffer.from(privateKeyDer), Buffer.from(publicKeyFromPem)) !== 0) {
  console.error("Keypair export sanity check failed.");
  process.exit(1);
}
console.log("Sanity check passed.");
