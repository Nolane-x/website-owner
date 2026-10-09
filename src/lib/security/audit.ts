import crypto from 'crypto';
import { getDb, initializeDatabase } from '../db';
import { securityEvents } from '../db/schema';

export async function logSecurityEvent(
  profileId: string,
  eventType: string,
  details?: Record<string, unknown> | null,
  ipAddress?: string | null,
  userAgent?: string | null
) {
  try {
    await initializeDatabase();
    const db = getDb();

    // Loại bỏ hoàn toàn bất kỳ trường nhạy cảm nào nếu có trong details
    const sanitizedDetails: Record<string, unknown> = details ? { ...details } : {};
    delete sanitizedDetails.password;
    delete sanitizedDetails.newPassword;
    delete sanitizedDetails.token;
    delete sanitizedDetails.ciphertext;
    delete sanitizedDetails.masterPassword;

    await db.insert(securityEvents).values({
      id: crypto.randomUUID(),
      profileId,
      eventType,
      detailsJson: sanitizedDetails,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Lỗi khi ghi nhật ký bảo mật:', error);
  }
}
