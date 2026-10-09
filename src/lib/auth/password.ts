import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Mật khẩu phải có độ dài tối thiểu 8 ký tự');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Mật khẩu không được vượt quá giới hạn 72 bytes của chuẩn bcrypt');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
