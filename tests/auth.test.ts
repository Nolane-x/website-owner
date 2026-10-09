import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { generateSessionToken, hashToken } from '../src/lib/auth/session';
import { sanitizeHtml, sanitizePlain } from '../src/lib/security/sanitize';
import { rateLimiter } from '../src/lib/security/rate-limit';
import { encryptVaultSecret, decryptVaultSecret } from '../src/lib/security/vault-crypto';

describe('Bảo mật & Xác thực - Core Security Tests', () => {
  it('Băm mật khẩu và đối chiếu mật khẩu chính xác', async () => {
    const rawPass = 'Secret@123456';
    const hash = await hashPassword(rawPass);
    expect(hash).not.toBe(rawPass);
    expect(hash.length).toBeGreaterThan(20);

    const match = await verifyPassword(rawPass, hash);
    expect(match).toBe(true);

    const wrongMatch = await verifyPassword('WrongPassword', hash);
    expect(wrongMatch).toBe(false);
  });

  it('Session Token có độ entropy cao và hàm băm SHA256 an toàn', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes hex = 64 chars

    const hash1 = hashToken(token1);
    const hash2 = hashToken(token1);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('Lọc mã độc XSS và bảo vệ nội dung an toàn', () => {
    const malicious = '<script>alert("hacked")</script><p>Nội dung hợp lệ</p><img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(malicious);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('<p>Nội dung hợp lệ</p>');

    const plainDirty = '<script>alert(1)</script>Hello & welcome!';
    const cleanPlain = sanitizePlain(plainDirty);
    expect(cleanPlain).not.toContain('<script>');
    expect(cleanPlain).toContain('Hello & welcome!');
  });

  it('Rate Limiter chặn brute-force đúng ngưỡng và thời gian', () => {
    const testKey = 'test-ip-key-' + Date.now();
    for (let i = 0; i < 3; i++) {
      const res = rateLimiter.check(testKey, 3, 10);
      expect(res.allowed).toBe(true);
    }
    // Lần thứ 4 phải bị chặn
    const blockedRes = rateLimiter.check(testKey, 3, 10);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it('Két mật mã mã hóa AES-256-GCM client-side giải mã chính xác với Master Password', async () => {
    const secret = 'MyUltraSecretPassword!#123';
    const master = 'MasterKey@2026';

    const encrypted = await encryptVaultSecret(secret, master);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toBe(secret);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();

    const decrypted = await decryptVaultSecret(encrypted, master);
    expect(decrypted).toBe(secret);

    // Thử sai master password phải ném lỗi giải mã
    await expect(decryptVaultSecret(encrypted, 'WrongMasterKey')).rejects.toThrow();
  });
});
