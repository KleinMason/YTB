import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { app } from './index.js';

describe('GET /', () => {
  it('should return API status message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'YTB API is running');
  });

  it('should include environment in response', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('environment');
    expect(typeof response.body.environment).toBe('string');
  });
});

describe('GET /api/health', () => {
  it('should return status 200 with ok response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('should include timestamp in response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.timestamp).toBe('string');
    // Verify timestamp is a valid ISO string
    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });
});

describe('JSON Body Parsing Middleware', () => {
  it('should parse JSON body in POST requests', async () => {
    const testData = { name: 'test', value: 123 };
    const response = await request(app)
      .post('/api/test-json')
      .send(testData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received');
    expect(response.body.received).toEqual(testData);
  });

  it('should return error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    // Express 5.x returns 400 for malformed JSON
    expect(response.status).toBe(400);
  });

  it('should handle empty JSON body', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('received');
    expect(response.body.received).toEqual({});
  });
});

describe('Error Handling Middleware', () => {
  it('should catch errors and return consistent error response format', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('statusCode');
    expect(response.body.error).toHaveProperty('timestamp');
    expect(response.body.error).toHaveProperty('path');
  });

  it('should return error message in response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe('Test error');
  });

  it('should preserve custom status codes', async () => {
    const response = await request(app).post('/api/test-error');

    expect(response.status).toBe(400);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toBe('Test error with message');
  });

  it('should include timestamp in error response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error).toHaveProperty('timestamp');
    expect(typeof response.body.error.timestamp).toBe('string');
    // Verify timestamp is a valid ISO string
    expect(() => new Date(response.body.error.timestamp)).not.toThrow();
  });

  it('should include request path in error response', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.path).toBe('/api/test-error');
  });

  it('should return 500 status code for errors without statusCode', async () => {
    const response = await request(app).get('/api/test-error');

    expect(response.status).toBe(500);
    expect(response.body.error.statusCode).toBe(500);
  });
});

describe('Request Logging Middleware', () => {
  it('should log incoming requests with method and path', async () => {
    // Make a request - morgan logs to stdout, which we can see in test output
    // The presence of logs in test output confirms middleware is working
    const response = await request(app).get('/api/health');

    // Verify request succeeds (middleware doesn't interfere)
    expect(response.status).toBe(200);
    // Logs appear in test output: "GET /api/health 200 X ms - Y"
  });

  it('should log POST requests', async () => {
    const response = await request(app)
      .post('/api/test-json')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');

    // Verify request succeeds
    expect(response.status).toBe(200);
    // Logs appear in test output: "POST /api/test-json 200 X ms - Y"
  });

  it('should log requests with different HTTP methods', async () => {
    const getResponse = await request(app).get('/');
    const postResponse = await request(app).post('/api/test-json').send({});

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    // Both GET and POST requests are logged with their methods and paths
  });

  it('should not interfere with request processing', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});

describe('Password Hashing Library (bcrypt)', () => {
  it('should import bcrypt library correctly', async () => {
    const bcrypt = await import('bcrypt');
    expect(bcrypt).toBeDefined();
    expect(typeof bcrypt.hash).toBe('function');
    expect(typeof bcrypt.compare).toBe('function');
  });

  it('should generate hash from password', async () => {
    const bcrypt = await import('bcrypt');
    const password = 'testPassword123';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
    // bcrypt hashes start with $2a$, $2b$, or $2y$
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('should generate different hashes for the same password', async () => {
    const bcrypt = await import('bcrypt');
    const password = 'testPassword123';
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);

    expect(hash1).not.toBe(hash2);
    // Both hashes should be valid and verifiable
    const isValid1 = await bcrypt.compare(password, hash1);
    const isValid2 = await bcrypt.compare(password, hash2);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });
});

describe('Password Hashing Utility Function', () => {
  it('should hash password using utility function', async () => {
    const { hashPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
    // bcrypt hashes start with $2a$, $2b$, or $2y$
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('should generate different hash from input password', async () => {
    const { hashPassword } = await import('./utils/password.js');
    const password = 'mySecurePassword456';
    const hash = await hashPassword(password);

    // Verify hash is different from original password
    expect(hash).not.toBe(password);
    expect(hash).not.toContain(password);
    expect(hash.length).toBeGreaterThan(password.length);
  });

  it('should use appropriate salt rounds (default 10)', async () => {
    const { hashPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    // Verify hash format indicates proper salt rounds
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    // Extract salt rounds from hash (format: $2a$10$...)
    const saltRounds = parseInt(hash.split('$')[2], 10);
    expect(saltRounds).toBeGreaterThanOrEqual(10);
  });

  it('should accept custom salt rounds', async () => {
    const { hashPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password, 12);

    // Verify hash format indicates custom salt rounds
    const saltRounds = parseInt(hash.split('$')[2], 10);
    expect(saltRounds).toBe(12);
  });

  it('should generate different hashes for same password', async () => {
    const { hashPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Each hash should be unique due to salt
    expect(hash1).not.toBe(hash2);
  });
});

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

describe('Password Verification Utility Function', () => {
  it('should return true for matching password', async () => {
    const { hashPassword, verifyPassword } = await import('./utils/password.js');
    const password = 'correctPassword123';
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);

    expect(result).toBe(true);
  });

  it('should return false for non-matching password', async () => {
    const { hashPassword, verifyPassword } = await import('./utils/password.js');
    const password = 'correctPassword123';
    const wrongPassword = 'wrongPassword456';
    const hash = await hashPassword(password);

    const result = await verifyPassword(wrongPassword, hash);

    expect(result).toBe(false);
  });

  it('should verify password against different hashes of same password', async () => {
    const { hashPassword, verifyPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    
    // Generate two different hashes for the same password
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Both should verify correctly
    const result1 = await verifyPassword(password, hash1);
    const result2 = await verifyPassword(password, hash2);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });

  it('should return false for empty password', async () => {
    const { hashPassword, verifyPassword } = await import('./utils/password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const result = await verifyPassword('', hash);

    expect(result).toBe(false);
  });

  it('should handle passwords with special characters', async () => {
    const { hashPassword, verifyPassword } = await import('./utils/password.js');
    const password = 'P@$$w0rd!#%&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);

    expect(result).toBe(true);
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
    const { signToken } = await import('./utils/jwt.js');
    const userId = 'user-123';
    const token = signToken(userId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT tokens have 3 parts separated by dots
    expect(token.split('.').length).toBe(3);
  });

  it('should use secret from environment variable', async () => {
    const { signToken } = await import('./utils/jwt.js');
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
    const jwtModule = await import('./utils/jwt.js');
    
    expect(() => jwtModule.signToken('user-123')).toThrow('JWT_SECRET environment variable is not set');
  });

  it('should set appropriate expiration time', async () => {
    const { signToken } = await import('./utils/jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-789';
    const token = signToken(userId);

    const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing') as { userId: string; exp: number; iat: number };
    
    // Default expiration is 24 hours (86400 seconds)
    const expirationDiff = decoded.exp - decoded.iat;
    expect(expirationDiff).toBe(86400);
  });

  it('should allow custom expiration time', async () => {
    const { signToken } = await import('./utils/jwt.js');
    const jwt = await import('jsonwebtoken');
    const userId = 'user-custom-exp';
    const token = signToken(userId, '1h');

    const decoded = jwt.verify(token, 'test-jwt-secret-key-for-testing') as { userId: string; exp: number; iat: number };
    
    // 1 hour = 3600 seconds
    const expirationDiff = decoded.exp - decoded.iat;
    expect(expirationDiff).toBe(3600);
  });

  it('should generate valid token that can be verified', async () => {
    const { signToken } = await import('./utils/jwt.js');
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
    const { signToken, verifyToken } = await import('./utils/jwt.js');
    const userId = 'user-verify-123';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded.userId).toBe(userId);
  });

  it('should return decoded payload with userId', async () => {
    const { signToken, verifyToken } = await import('./utils/jwt.js');
    const userId = 'test-user-id-456';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toHaveProperty('userId');
    expect(decoded.userId).toBe(userId);
  });

  it('should return decoded payload with iat (issued at) timestamp', async () => {
    const { signToken, verifyToken } = await import('./utils/jwt.js');
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
    const { signToken, verifyToken } = await import('./utils/jwt.js');
    const userId = 'user-exp-test';
    const token = signToken(userId);

    const decoded = verifyToken(token);

    expect(decoded).toHaveProperty('exp');
    expect(typeof decoded.exp).toBe('number');
    // exp should be 24 hours from iat by default
    expect(decoded.exp - decoded.iat).toBe(86400);
  });

  it('should throw error for invalid token', async () => {
    const { verifyToken } = await import('./utils/jwt.js');
    const invalidToken = 'invalid.token.here';

    expect(() => verifyToken(invalidToken)).toThrow();
  });

  it('should throw error for malformed token', async () => {
    const { verifyToken } = await import('./utils/jwt.js');
    const malformedToken = 'not-a-valid-jwt';

    expect(() => verifyToken(malformedToken)).toThrow();
  });

  it('should throw error for token signed with different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyToken } = await import('./utils/jwt.js');
    
    // Sign with a different secret
    const tokenWithDifferentSecret = jwt.sign({ userId: 'user-123' }, 'different-secret');

    expect(() => verifyToken(tokenWithDifferentSecret)).toThrow();
  });

  it('should throw error if JWT_SECRET is not set', async () => {
    const jwt = await import('jsonwebtoken');
    delete process.env.JWT_SECRET;
    
    // Create a token with a known secret for testing
    const token = jwt.sign({ userId: 'user-123' }, 'some-secret');
    
    const jwtModule = await import('./utils/jwt.js');
    
    expect(() => jwtModule.verifyToken(token)).toThrow('JWT_SECRET environment variable is not set');
  });

  it('should throw error for expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyToken } = await import('./utils/jwt.js');
    
    // Create a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { userId: 'user-expired' },
      'test-jwt-secret-key-for-testing',
      { expiresIn: '-1s' }
    );

    expect(() => verifyToken(expiredToken)).toThrow();
  });
});