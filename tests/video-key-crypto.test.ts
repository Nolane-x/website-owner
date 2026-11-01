import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptAes256Gcm, encryptAes256Gcm } from '@/lib/security/secret-crypto';

describe('AES-256-GCM secret storage', () => {
  it('round-trips a YouTube API key without storing plaintext', () => {
    const key = randomBytes(32);
    const apiKey = 'AIzaSyExampleKeyValueForUnitTest123456789';
    const encrypted = encryptAes256Gcm(apiKey, key);

    expect(encrypted.ciphertext).not.toContain(apiKey);
    expect(encrypted.algorithm).toBe('aes-256-gcm');
    expect(decryptAes256Gcm(encrypted, key)).toBe(apiKey);
  });

  it('uses a fresh nonce for every encryption', () => {
    const key = randomBytes(32);
    const first = encryptAes256Gcm('same-secret-value', key);
    const second = encryptAes256Gcm('same-secret-value', key);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('rejects modified ciphertext and incorrect encryption keys', () => {
    const key = randomBytes(32);
    const payload = encryptAes256Gcm('AIzaSyExampleKeyValueForUnitTest123456789', key);
    // Change a middle Base64URL character so the decoded ciphertext byte always changes.
    // The final character can contain unused padding bits; changing only those bits may decode
    // to the original bytes and make this authentication regression test flaky.
    const tamperIndex = Math.floor(payload.ciphertext.length / 2);
    const replacement = payload.ciphertext[tamperIndex] === 'A' ? 'B' : 'A';
    const tampered = {
      ...payload,
      ciphertext: payload.ciphertext.slice(0, tamperIndex) + replacement + payload.ciphertext.slice(tamperIndex + 1),
    };

    expect(() => decryptAes256Gcm(tampered, key)).toThrow();
    expect(() => decryptAes256Gcm(payload, randomBytes(32))).toThrow();
  });

  it('rejects malformed payloads and invalid encryption-key lengths', () => {
    expect(() => decryptAes256Gcm({}, randomBytes(32))).toThrow();
    expect(() => encryptAes256Gcm('secret', randomBytes(16))).toThrow();
    expect(() => decryptAes256Gcm({}, randomBytes(16))).toThrow();
  });
});
