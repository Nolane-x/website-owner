import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface Aes256GcmPayload {
  version: 1;
  algorithm: 'aes-256-gcm';
  ciphertext: string;
  iv: string;
  authTag: string;
}

/** Encrypt a secret with a 32-byte key and a fresh 96-bit nonce. */
export function encryptAes256Gcm(plaintext: string, encryptionKey: Uint8Array): Aes256GcmPayload {
  if (encryptionKey.byteLength !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte encryption key.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: cipher.getAuthTag().toString('base64url'),
  };
}

/** Authenticate and decrypt a previously encrypted secret. Tampering throws. */
export function decryptAes256Gcm(payload: unknown, encryptionKey: Uint8Array): string {
  if (encryptionKey.byteLength !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte encryption key.');
  }
  if (!payload || typeof payload !== 'object') throw new Error('Encrypted secret payload is invalid.');
  const value = payload as Partial<Aes256GcmPayload>;
  if (value.version !== 1 || value.algorithm !== 'aes-256-gcm' ||
      typeof value.ciphertext !== 'string' || typeof value.iv !== 'string' ||
      typeof value.authTag !== 'string') {
    throw new Error('Encrypted secret payload is invalid.');
  }

  const iv = Buffer.from(value.iv, 'base64url');
  const authTag = Buffer.from(value.authTag, 'base64url');
  const ciphertext = Buffer.from(value.ciphertext, 'base64url');
  if (iv.byteLength !== 12 || authTag.byteLength !== 16 || ciphertext.byteLength === 0) {
    throw new Error('Encrypted secret payload has invalid lengths.');
  }

  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
