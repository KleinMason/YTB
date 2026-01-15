import jwt from 'jsonwebtoken';

/**
 * Get the JWT secret from environment variables
 * @throws Error if JWT_SECRET is not set
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Default token expiration time (24 hours)
 */
const DEFAULT_EXPIRATION = '24h';

/**
 * Sign a JWT token with user id
 * @param userId - The user ID to include in the token payload
 * @param expiresIn - Token expiration time (default: 24h)
 * @returns Signed JWT token string
 */
export function signToken(
  userId: string,
  expiresIn: string = DEFAULT_EXPIRATION
): string {
  const secret = getJwtSecret();
  
  return jwt.sign(
    { userId },
    secret,
    { expiresIn }
  );
}
