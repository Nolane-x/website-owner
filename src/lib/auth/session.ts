import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb, initializeDatabase } from '../db';
import { sessions, profiles } from '../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { COOKIE_SESSION_NAME, COOKIE_MAX_AGE_SECONDS, SESSION_EXPIRY_DAYS } from '../security/constants';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(
  profileId: string,
  ipAddress?: string | null,
  userAgent?: string | null,
  isTrusted: boolean = false
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  await initializeDatabase();
  const db = getDb();

  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const sessionId = crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (isTrusted ? SESSION_EXPIRY_DAYS : 7));

  await db.insert(sessions).values({
    id: sessionId,
    tokenHash,
    profileId,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    isTrusted,
    expiresAt,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    isRevoked: false,
  });

  return { token, sessionId, expiresAt };
}

export async function validateSessionToken(token: string): Promise<{
  session: typeof sessions.$inferSelect;
  profile: typeof profiles.$inferSelect;
} | null> {
  if (!token) return null;
  await initializeDatabase();
  const db = getDb();

  const tokenHash = hashToken(token);
  const now = new Date();

  const result = await db
    .select({
      session: sessions,
      profile: profiles,
    })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.profileId, profiles.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        eq(sessions.isRevoked, false)
      )
    )
    .limit(1);

  if (!result || result.length === 0) {
    return null;
  }

  const { session, profile } = result[0];

  if (new Date(session.expiresAt) <= now) {
    // Session hết hạn
    return null;
  }

  // Cập nhật lastActiveAt
  await db
    .update(sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessions.id, session.id));

  return { session, profile };
}

export async function revokeSession(sessionId: string, profileId: string): Promise<boolean> {
  await initializeDatabase();
  const db = getDb();

  await db
    .update(sessions)
    .set({ isRevoked: true })
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId)
      )
    );

  return true;
}

export async function revokeAllSessions(profileId: string): Promise<boolean> {
  await initializeDatabase();
  const db = getDb();

  await db
    .update(sessions)
    .set({ isRevoked: true })
    .where(eq(sessions.profileId, profileId));

  return true;
}

export async function revokeOtherSessions(profileId: string, currentSessionId: string): Promise<boolean> {
  await initializeDatabase();
  const db = getDb();

  await db
    .update(sessions)
    .set({ isRevoked: true })
    .where(
      and(
        eq(sessions.profileId, profileId),
        ne(sessions.id, currentSessionId)
      )
    );

  return true;
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSION_NAME)?.value;
  if (!token) return null;

  return await validateSessionToken(token);
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_SESSION_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_SESSION_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
