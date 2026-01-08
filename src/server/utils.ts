// Dynamic import to avoid bundler warnings - auth.ts is already dynamically imported elsewhere
export async function checkAuthStatus(
  ...args: Parameters<typeof import("./auth").checkAuthStatus>
) {
  const { checkAuthStatus: fn } = await import("./auth");
  return fn(...args);
}

export async function validateLineageRequest(
  ...args: Parameters<typeof import("./auth").validateLineageRequest>
) {
  const { validateLineageRequest: fn } = await import("./auth");
  return fn(...args);
}

export {
  ConnectionFactory,
  LineageConnectionFactory,
  LineageDBInit,
  PerUserDBConnectionFactory,
  dumpAndSendDB,
  getUserBasicInfo
} from "./database";

export { hashPassword, checkPassword, checkPasswordSafe } from "./password";

export { sendEmailVerification, LINEAGE_JWT_EXPIRY } from "./email";
