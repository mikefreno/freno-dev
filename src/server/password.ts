import * as bcrypt from "bcrypt";

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
 */
export async function checkPasswordSafe(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  const hashToCompare = hash || DUMMY_HASH;
  const match = await bcrypt.compare(password, hashToCompare);

  return hash ? match : false;
}
