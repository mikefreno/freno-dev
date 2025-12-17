import * as bcrypt from "bcrypt";

// Asynchronous function to hash a password
export async function hashPassword(password: string): Promise<string> {
  // 10 here is the number of rounds of hashing to apply
  // The higher the number, the more secure but also the slower
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

// Asynchronous function to check a password against a hash
export async function checkPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const match = await bcrypt.compare(password, hash);
  return match;
}
