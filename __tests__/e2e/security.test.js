const { hashPassword, verifyPassword, createAccessToken, verifyToken } = require('@/core/security');
const jwt = require('jsonwebtoken');

describe('Security Functions Tests', () => {
  describe('Password Hashing and Verification', () => {
    test('should hash password with different salts', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
      expect(hash1).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
      expect(hash2).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    test('should verify password correctly', async () => {
      const password = 'testPassword123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);
      const isInvalid = await verifyPassword('wrongPassword', hashedPassword);

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should handle empty password verification', async () => {
      const password = 'testpassword';
      const hashedPassword = await hashPassword(password);
      
      await expect(verifyPassword('', hashedPassword))
        .rejects
        .toThrow('Password is required for verification');
      
      await expect(verifyPassword(null, hashedPassword))
        .rejects
        .toThrow('Password is required for verification');
    });

    test('should handle long password verification', async () => {
      const longPassword = 'a'.repeat(1000); // Very long password
      const hashedPassword = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('Token Creation and Verification', () => {
    test('should create access token with user ID', () => {
      const user = { id: 'test123', _id: 'test123' };
      const token = createAccessToken(user);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
    });

    test('should handle both id and _id in user object', () => {
      const user1 = { id: 'test123' };
      const user2 = { _id: 'test123' };

      const token1 = createAccessToken(user1);
      const token2 = createAccessToken(user2);

      const decoded1 = verifyToken(token1);
      const decoded2 = verifyToken(token2);

      expect(decoded1.userId).toBe('test123');
      expect(decoded2.userId).toBe('test123');
    });

    test('should verify valid token', () => {
      const user = { id: 'test123' };
      const token = createAccessToken(user);
      const decoded = verifyToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe('test123');
      expect(decoded.exp).toBeDefined();
    });

    test('should handle invalid token verification', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyToken(invalidToken);
      expect(decoded).toBeNull();
    });

    test('should handle expired token verification', () => {
      const expiredToken = jwt.sign(
        { userId: 'test123' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      const decoded = verifyToken(expiredToken);
      expect(decoded).toBeNull();
    });

    test('should handle malformed token verification', () => {
      const malformedToken = 'not.a.jwt.token';
      const decoded = verifyToken(malformedToken);
      expect(decoded).toBeNull();
    });

    test('should handle token with wrong secret', () => {
      const token = jwt.sign(
        { userId: 'test123' },
        'wrong-secret',
        { expiresIn: '1d' }
      );
      const decoded = verifyToken(token);
      expect(decoded).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined user in token creation', () => {
      expect(() => createAccessToken(null)).toThrow();
      expect(() => createAccessToken(undefined)).toThrow();
    });

    test('should handle null/undefined password in verification', async () => {
      const hashedPassword = await hashPassword('testpassword');
      
      await expect(verifyPassword(undefined, hashedPassword))
        .rejects
        .toThrow('Password is required for verification');
      
      await expect(verifyPassword(null, hashedPassword))
        .rejects
        .toThrow('Password is required for verification');
    });

    test('should handle null/undefined hashed password in verification', async () => {
      await expect(verifyPassword('testpassword', null))
        .rejects
        .toThrow('Hashed password is required for verification');
      
      await expect(verifyPassword('testpassword', undefined))
        .rejects
        .toThrow('Hashed password is required for verification');
    });

    test('should handle non-string password inputs', async () => {
      const hashedPassword = await hashPassword('testpassword');
      
      await expect(verifyPassword(123, hashedPassword))
        .rejects
        .toThrow('Password must be a string');
      
      await expect(verifyPassword({}, hashedPassword))
        .rejects
        .toThrow('Password must be a string');
    });

    test('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);
      const isValid = await verifyPassword(specialPassword, hashedPassword);
      expect(isValid).toBe(true);
    });
  });
}); 