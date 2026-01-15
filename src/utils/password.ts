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
