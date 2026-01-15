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

/**
 * Decoded JWT payload type
 */
export interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * Verify and decode a JWT token
 * @param token - The JWT token string to verify
 * @returns Decoded payload containing userId, iat, and exp
 * @throws Error if token is invalid, expired, or JWT_SECRET is not set
 */
export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  
  const decoded = jwt.verify(token, secret);
  
  return decoded as JwtPayload;
}
