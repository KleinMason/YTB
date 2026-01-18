import { describe, expect, it } from 'vitest';

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
    const { hashPassword } = await import('./password.js');
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
    const { hashPassword } = await import('./password.js');
    const password = 'mySecurePassword456';
    const hash = await hashPassword(password);

    // Verify hash is different from original password
    expect(hash).not.toBe(password);
    expect(hash).not.toContain(password);
    expect(hash.length).toBeGreaterThan(password.length);
  });

  it('should use appropriate salt rounds (default 10)', async () => {
    const { hashPassword } = await import('./password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    // Verify hash format indicates proper salt rounds
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    // Extract salt rounds from hash (format: $2a$10$...)
    const saltRounds = parseInt(hash.split('$')[2], 10);
    expect(saltRounds).toBeGreaterThanOrEqual(10);
  });

  it('should accept custom salt rounds', async () => {
    const { hashPassword } = await import('./password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password, 12);

    // Verify hash format indicates custom salt rounds
    const saltRounds = parseInt(hash.split('$')[2], 10);
    expect(saltRounds).toBe(12);
  });

  it('should generate different hashes for same password', async () => {
    const { hashPassword } = await import('./password.js');
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Each hash should be unique due to salt
    expect(hash1).not.toBe(hash2);
  });
});

describe('Password Verification Utility Function', () => {
  it('should return true for matching password', async () => {
    const { hashPassword, verifyPassword } = await import('./password.js');
    const password = 'correctPassword123';
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);

    expect(result).toBe(true);
  });

  it('should return false for non-matching password', async () => {
    const { hashPassword, verifyPassword } = await import('./password.js');
    const password = 'correctPassword123';
    const wrongPassword = 'wrongPassword456';
    const hash = await hashPassword(password);

    const result = await verifyPassword(wrongPassword, hash);

    expect(result).toBe(false);
  });

  it('should verify password against different hashes of same password', async () => {
    const { hashPassword, verifyPassword } = await import('./password.js');
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
    const { hashPassword, verifyPassword } = await import('./password.js');
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const result = await verifyPassword('', hash);

    expect(result).toBe(false);
  });

  it('should handle passwords with special characters', async () => {
    const { hashPassword, verifyPassword } = await import('./password.js');
    const password = 'P@$$w0rd!#%&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);

    const result = await verifyPassword(password, hash);

    expect(result).toBe(true);
  });
});
