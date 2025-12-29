import * as bcrypt from "bcrypt";

/**
 * Dummy hash for timing attack prevention
 * This is a pre-computed bcrypt hash that will be used when a user doesn't exist
 * to maintain constant-time behavior
 */
const DUMMY_HASH =
  "$2b$10$YxVvS6L6HhS1pVBP6nZK0.9r0xwN8xvvzX7GwL5xvKJ6xvS6L6HhS1";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

export async function checkPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const match = await bcrypt.compare(password, hash);
  return match;
}

/**
 * Check password with timing attack protection
 * Always runs bcrypt comparison even if user doesn't exist
 */
export async function checkPasswordSafe(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  // If no hash provided, use dummy hash to maintain constant timing
  const hashToCompare = hash || DUMMY_HASH;
  const match = await bcrypt.compare(password, hashToCompare);

  // Return false if no real hash was provided
  return hash ? match : false;
}
