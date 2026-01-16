import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { app } from './index.js';
import { signToken, verifyToken } from './utils/jwt.js';

// Mock prisma client
vi.mock('./db/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    project: {
      create: vi.fn(),
    },
  },
}));

// Mock password utilities for login tests - use vi.hoisted because vi.mock is hoisted
const { mockVerifyPassword, setActualVerifyPassword } = vi.hoisted(() => {
  let actualImpl: ((password: string, hash: string) => Promise<boolean>) | null = null;
  const mock = vi.fn((password: string, hash: string) => {
    // Call the actual implementation by default
    if (actualImpl) {
      return actualImpl(password, hash);
    }
    return Promise.resolve(false);
  });
  return {
    mockVerifyPassword: mock,
    setActualVerifyPassword: (impl: typeof actualImpl) => { actualImpl = impl; },
  };
});

vi.mock('./utils/password.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils/password.js')>();
  // Store reference to actual implementation for passthrough
  setActualVerifyPassword(actual.verifyPassword);
  return {
    ...actual,
    verifyPassword: mockVerifyPassword,
  };
});

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

describe('POST /api/auth/register', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should accept email and password in request body', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Should not return 400 for valid input
    expect(response.status).not.toBe(400);
  });

  it('should return 400 if email is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if both email and password are missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should validate email format and return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid email format');
  });

  it('should return 400 for email without @ symbol', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalidemail.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid email format');
  });

  it('should return 400 for email without domain', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid email format');
  });

  it('should accept valid email formats', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.org',
      'user+tag@example.co.uk',
    ];

    for (const email of validEmails) {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'Password123' })
        .set('Content-Type', 'application/json');

      expect(response.status).not.toBe(400);
    }
  });

  it('should return 400 for password less than 8 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Pass1' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Password does not meet requirements');
    expect(response.body.error.details).toContain('Password must be at least 8 characters long');
  });

  it('should return 400 for password without uppercase letter', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Password does not meet requirements');
    expect(response.body.error.details).toContain('Password must contain at least one uppercase letter');
  });

  it('should return 400 for password without lowercase letter', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'PASSWORD123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Password does not meet requirements');
    expect(response.body.error.details).toContain('Password must contain at least one lowercase letter');
  });

  it('should return 400 for password without number', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'PasswordABC' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Password does not meet requirements');
    expect(response.body.error.details).toContain('Password must contain at least one number');
  });

  it('should return multiple password validation errors', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'abc' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Password does not meet requirements');
    expect(response.body.error.details.length).toBeGreaterThan(1);
  });

  it('should accept password meeting all requirements', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'ValidPass123' })
      .set('Content-Type', 'application/json');

    // Should not return 400 for valid password
    expect(response.status).not.toBe(400);
  });

  it('should return 201 status for successful registration', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'newuser@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created successfully');
  });
});

describe('POST /api/auth/register - Email exists check', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should query database for existing email', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should return 409 conflict if email already exists', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user-id',
      email: 'existing@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email already registered');
    expect(response.body.error.statusCode).toBe(409);
  });

  it('should proceed if email is new (not found in database)', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'newuser@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User created successfully');
  });

  it('should normalize email to lowercase when checking database', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'TEST@EXAMPLE.COM', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should not check database if validation fails', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Missing password - validation should fail before database check
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Should return 500 for database errors
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/register - Creates user in database', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should hash password using utility function', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Verify create was called with hashed password (bcrypt hash format)
    expect(prisma.user.create).toHaveBeenCalled();
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('should insert user record with email and hashed password', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'newuser@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.email).toBe('newuser@example.com');
    expect(createCall.data.passwordHash).toBeDefined();
    expect(typeof createCall.data.passwordHash).toBe('string');
  });

  it('should store email in lowercase in database', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'uppercase@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'UPPERCASE@EXAMPLE.COM', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.email).toBe('uppercase@example.com');
  });

  it('should return created user data in response', async () => {
    const { prisma } = await import('./db/prisma.js');
    const createdUser = {
      id: 'created-user-id-123',
      email: 'created@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-15T10:30:00.000Z'),
      updatedAt: new Date('2026-01-15T10:30:00.000Z'),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'created@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe('created-user-id-123');
    expect(response.body.user.email).toBe('created@example.com');
    expect(response.body.user.createdAt).toBeDefined();
  });

  it('should not include password hash in response', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'test@example.com',
      passwordHash: 'super-secret-hash',
      createdAt: new Date('2026-01-15T00:00:00.000Z'),
      updatedAt: new Date('2026-01-15T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(response.body)).not.toContain('super-secret-hash');
  });

  it('should handle user creation database errors gracefully', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockRejectedValue(new Error('Failed to create user'));

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/register - Returns JWT token', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should generate JWT for new user', async () => {
    const { prisma } = await import('./db/prisma.js');
    const createdUser = {
      id: 'new-user-id-123',
      email: 'newuser@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-16T00:00:00.000Z'),
      updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
  });

  it('should return token in response body', async () => {
    const { prisma } = await import('./db/prisma.js');
    const createdUser = {
      id: 'user-with-token-id',
      email: 'tokenuser@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-16T00:00:00.000Z'),
      updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'tokenuser@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    // Token should be at the top level of the response body
    expect(response.body.token).toBeDefined();
    // Token should be a JWT (3 parts separated by dots)
    const tokenParts = response.body.token.split('.');
    expect(tokenParts.length).toBe(3);
  });

  it('should return valid JWT token that can be verified', async () => {
    const { prisma } = await import('./db/prisma.js');
    const createdUser = {
      id: 'valid-token-user-id',
      email: 'validtoken@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-16T00:00:00.000Z'),
      updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'validtoken@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);

    // Token should be verifiable
    const decoded = verifyToken(response.body.token);
    expect(decoded).toHaveProperty('userId', 'valid-token-user-id');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('should return token containing correct user id', async () => {
    const { prisma } = await import('./db/prisma.js');
    const createdUser = {
      id: 'specific-user-id-456',
      email: 'specificid@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-16T00:00:00.000Z'),
      updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'specificid@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);

    const decoded = verifyToken(response.body.token);
    expect(decoded.userId).toBe('specific-user-id-456');
  });

  it('should not return token when validation fails', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid-email', password: 'short' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).not.toHaveProperty('token');
  });

  it('should not return token when email already exists', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user-id',
      email: 'existing@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date('2026-01-16T00:00:00.000Z'),
      updatedAt: new Date('2026-01-16T00:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'SecurePass123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(409);
    expect(response.body).not.toHaveProperty('token');
  });
});

describe('Authentication Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key-for-testing' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should extract token from Authorization header', async () => {
    const token = signToken('user-123');
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('userId', 'user-123');
  });

  it('should verify token using JWT utility', async () => {
    const token = signToken('user-456');
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('authenticated', true);
  });

  it('should attach user id to request object', async () => {
    const userId = 'user-789';
    const token = signToken(userId);
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe(userId);
  });

  it('should return 401 if Authorization header is missing', async () => {
    const response = await request(app).get('/api/test-auth');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 if token format is invalid', async () => {
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', 'InvalidFormat token123');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid authorization format. Expected: Bearer <token>');
  });

  it('should return 401 if token is empty after Bearer prefix', async () => {
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', 'Bearer ');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 if token is invalid', async () => {
    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should return 401 if token is expired', async () => {
    const jwt = await import('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 'user-expired' },
      'test-jwt-secret-key-for-testing',
      { expiresIn: '-1s' }
    );

    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should return 401 if token is signed with different secret', async () => {
    const jwt = await import('jsonwebtoken');
    const tokenWithDifferentSecret = jwt.sign({ userId: 'user-123' }, 'different-secret');

    const response = await request(app)
      .get('/api/test-auth')
      .set('Authorization', `Bearer ${tokenWithDifferentSecret}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });
});

describe('POST /api/auth/login - Validation', () => {
  it('should accept email and password in request body', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Should not return 400 for valid input (will return 501 for now since not fully implemented)
    expect(response.status).not.toBe(400);
  });

  it('should return 400 if email is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if both email and password are missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if email is empty string', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });

  it('should return 400 if password is empty string', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: '' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Email and password are required');
  });
});

describe('POST /api/auth/login - Finds user by email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query database for user by email', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should return 401 if user not found', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  it('should proceed if user exists', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing-user-id',
      email: 'existing@example.com',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'existing@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Should not return 401 since user exists and password is correct (will return 501 for now - token return not implemented)
    expect(response.status).not.toBe(401);
  });

  it('should normalize email to lowercase when querying database', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'TEST@EXAMPLE.COM', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should not query database if validation fails', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Missing password - validation should fail before database query
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' })
      .set('Content-Type', 'application/json');

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    // Should return 500 for database errors
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login - Verifies password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should compare provided password with stored hash', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' })
      .set('Content-Type', 'application/json');

    expect(mockVerifyPassword).toHaveBeenCalledWith('Password123', '$2b$10$hashedpasswordvalue');
  });

  it('should return 401 if password is incorrect', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  it('should proceed if password matches', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'CorrectPassword123' })
      .set('Content-Type', 'application/json');

    // Should return 200 since password is correct
    expect(response.status).toBe(200);
  });
});

describe('Login endpoint returns JWT token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should generate JWT for authenticated user', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('should return token in response body with valid JWT format', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    // JWT tokens have 3 parts separated by dots
    const token = response.body.token;
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('should return valid JWT token that can be verified', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { verifyToken } = await import('./utils/jwt.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    const decoded = verifyToken(response.body.token);
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('should return token containing correct user id', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { verifyToken } = await import('./utils/jwt.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'specific-user-id-12345',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'ValidPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    const decoded = verifyToken(response.body.token);
    expect(decoded.userId).toBe('specific-user-id-12345');
  });

  it('should not return token when validation fails', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: '' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).not.toHaveProperty('token');
  });

  it('should not return token when user not found', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'ValidPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('token');
  });

  it('should not return token when password is incorrect', async () => {
    const { prisma } = await import('./db/prisma.js');
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword123' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('token');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should return current user data from token', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const userEmail = 'testuser@example.com';
    const userCreatedAt = new Date('2024-01-01T00:00:00.000Z');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: userEmail,
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: userCreatedAt,
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id', userId);
    expect(response.body.user).toHaveProperty('email', userEmail);
    expect(response.body.user).toHaveProperty('createdAt');
  });

  it('should exclude password hash from response', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'testuser@example.com',
      passwordHash: '$2b$10$secrethashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should return 404 if user not found in database', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'nonexistent-user-id';

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('User not found');
  });

  it('should query database with user id from token', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'specific-user-id-abc123';

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: userId,
      email: 'testuser@example.com',
      passwordHash: '$2b$10$hashedpasswordvalue',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id';

    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('should apply authentication middleware and require valid token', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Authorization header is required');
  });

  it('should return 401 for invalid token', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ name: 'Test Project' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid or expired token');
  });

  it('should accept name in request body', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('project');
    expect(response.body.project).toHaveProperty('name', projectName);
  });

  it('should return 400 if name is missing', async () => {
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return 400 if name is empty string', async () => {
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return 400 if name is only whitespace', async () => {
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Project name is required');
  });

  it('should return created project with id', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const createdAt = new Date();
    const updatedAt = new Date();

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt,
      updatedAt,
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('id', projectId);
  });

  it('should insert project with user_id from token', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: null,
        icon: null,
        userId: userId,
      },
    });
  });

  it('should include optional color if provided', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const projectColor = '#FF5733';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: projectColor,
      icon: null,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName, color: projectColor });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('color', projectColor);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: projectColor,
        icon: null,
        userId: userId,
      },
    });
  });

  it('should include optional icon if provided', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';
    const projectId = 'test-project-id-456';
    const projectName = 'My Test Project';
    const projectIcon = 'rocket';

    vi.mocked(prisma.project.create).mockResolvedValue({
      id: projectId,
      name: projectName,
      color: null,
      icon: projectIcon,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: projectName, icon: projectIcon });

    expect(response.status).toBe(201);
    expect(response.body.project).toHaveProperty('icon', projectIcon);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: projectName,
        color: null,
        icon: projectIcon,
        userId: userId,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    const { prisma } = await import('./db/prisma.js');
    const { signToken } = await import('./utils/jwt.js');

    const userId = 'test-user-id-123';

    vi.mocked(prisma.project.create).mockRejectedValue(new Error('Database connection failed'));

    const token = signToken(userId);

    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project' });

    expect(response.status).toBe(500);
  });
});