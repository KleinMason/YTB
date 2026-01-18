import { describe, expect, it, beforeEach, afterEach } from 'vitest';

describe('JWT Library (jsonwebtoken)', () => {
  it('should import jsonwebtoken library correctly', async () => {
    const jwt = await import('jsonwebtoken');
    expect(jwt).toBeDefined();
    expect(typeof jwt.sign).toBe('function');
    expect(typeof jwt.verify).toBe('function');
    expect(typeof jwt.decode).toBe('function');
  });

  it('should sign a payload and generate a token', async () => {
    const jwt = await import('jsonwebtoken');
    const payload = { userId: 123, email: 'test@example.com' };
    const secret = 'test-secret-key';
    const token = jwt.sign(payload, secret);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT tokens have 3 parts separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('should verify a valid token and return payload', async () => {
    const jwt = await import('jsonwebtoken');
    const payload = { userId: 456, email: 'verify@example.com' };
    const secret = 'test-secret-key';
    const token = jwt.sign(payload, secret);

    const decoded = jwt.verify(token, secret) as { userId: number; email: string; iat: number };
    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(456);
    expect(decoded.email).toBe('verify@example.com');
    expect(decoded.iat).toBeDefined(); // Issued at timestamp
  });

  it('should throw error for invalid token', async () => {
    const jwt = await import('jsonwebtoken');
    const secret = 'test-secret-key';
    const invalidToken = 'invalid.token.here';

    expect(() => jwt.verify(invalidToken, secret)).toThrow();
  });

  it('should throw error for token signed with different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const payload = { userId: 789 };
    const token = jwt.sign(payload, 'secret-one');

    expect(() => jwt.verify(token, 'secret-two')).toThrow();
  });
});

describe('JWT Signing Utility Function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should sign a token with user id', async () => {
    const { signToken } = await import('./jwt.js');
    const userId = 'user-123';
    const token = signToken(userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT tokens have 3 parts separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('should use secret from environment variable', async () => {
    const { signToken } = await import('./jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-456';
    const token = signToken(userId);

    // Verify the token can be decoded with the same secret
    const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing') as { userId: string };
    expect(decoded.userId).toBe(userId);
  });

  it('should throw error if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;

    // Need to re-import to get fresh module with new env
    const jwtModule = await import('./jwt.js');

    expect(() => jwtModule.signToken('user-123')).toThrow('JWT_SECRET environment variable is not set');
  });

  it('should set appropriate expiration time', async () => {
    const { signToken } = await import('./jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-789';
    const token = signToken(userId);

    const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing') as { userId: string; exp: number; iat: number };

    // Default expiration is 24 hours (86400 seconds)
    const expirationDiff = decoded.exp - decoded.iat;
    expect(expirationDiff).toBe(86400);
  });

  it('should allow custom expiration time', async () => {
    const { signToken } = await import('./jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-custom-exp';
    const token = signToken(userId, '1h');

    const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing') as { userId: string; exp: number; iat: number };

    // 1 hour = 3600 seconds
    const expirationDiff = decoded.exp - decoded.iat;
    expect(expirationDiff).toBe(3600);
  });

  it('should generate valid token that can be verified', async () => {
    const { signToken } = await import('./jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-verify-test';
    const token = signToken(userId);

    // Should not throw when verifying with correct secret
    expect(() => jwt.verify(token, 'test-jwt-secret-key-for-testing')).not.toThrow();

    // Should throw when verifying with wrong secret
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });
});

describe('JWT Verification Utility Function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should verify and decode a valid token', async () => {
    const { signToken, verifyToken } = await import('./jwt.js');
    const userId = 'user-verify-123';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  it('should return decoded payload with userId', async () => {
    const { signToken, verifyToken } = await import('./jwt.js');
    const userId = 'test-user-id-456';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toHaveProperty('userId');
    expect(decoded.userId).toBe(userId);
  });

  it('should return decoded payload with iat (issued at) timestamp', async () => {
    const { signToken, verifyToken } = await import('./jwt.js');
    const userId = 'user-iat-test';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toHaveProperty('iat');
    expect(typeof decoded.iat).toBe('number');
    // iat should be close to current time
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.iat).toBeLessThanOrEqual(now);
    expect(decoded.iat).toBeGreaterThan(now - 10);
  });

  it('should return decoded payload with exp (expiration) timestamp', async () => {
    const { signToken, verifyToken } = await import('./jwt.js');
    const userId = 'user-exp-test';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toHaveProperty('exp');
    expect(typeof decoded.exp).toBe('number');
    // exp should be 24 hours from iat by default
    expect(decoded.exp - decoded.iat).toBe(86400);
  });

  it('should throw error for invalid token', async () => {
    const { verifyToken } = await import('./jwt.js');
    const invalidToken = 'invalid.token.here';

    expect(() => verifyToken(invalidToken)).toThrow();
  });

  it('should throw error for malformed token', async () => {
    const { verifyToken } = await import('./jwt.js');
    const malformedToken = 'not-a-valid-jwt';

    expect(() => verifyToken(malformedToken)).toThrow();
  });

  it('should throw error for token signed with different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyToken } = await import('./jwt.js');

    // Sign with a different secret
    const tokenWithDifferentSecret = jwt.sign({ userId: 'user-123' }, 'different-secret');

    expect(() => verifyToken(tokenWithDifferentSecret)).toThrow();
  });

  it('should throw error if JWT_SECRET is not set', async () => {
    const jwt = await import('jsonwebtoken');
    delete process.env.JWT_SECRET;

    // Create a token with a known secret for testing
    const token = jwt.sign({ userId: 'user-123' }, 'some-secret');

    const jwtModule = await import('./jwt.js');

    expect(() => jwtModule.verifyToken(token)).toThrow('JWT_SECRET environment variable is not set');
  });

  it('should throw error for expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyToken } = await import('./jwt.js');

    // Create a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { userId: 'user-expired' },
      'test-jwt-secret-key-for-testing',
      { expiresIn: '-1s' }
    );

    expect(() => verifyToken(expiredToken)).toThrow();
  });
});
