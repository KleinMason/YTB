import bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt
 * @param password - The plain text password to hash
 * @param saltRounds - Number of salt rounds (default: 10)
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 10
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
