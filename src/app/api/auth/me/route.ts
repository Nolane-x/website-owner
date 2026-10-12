import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const sessionData = await getSessionFromCookies();
  if (!sessionData) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const summaryOnly = new URL(req.url).searchParams.get('summary') === '1';
  let presentation: { avatarUrl: string | null; bio: string | null } | null = null;

  if (!summaryOnly) {
    await initializeDatabase();
    const [details] = await getDb()
      .select({ avatarUrl: profiles.avatarUrl, bio: profiles.bio })
      .from(profiles)
      .where(eq(profiles.id, sessionData.profile.id))
      .limit(1);
    presentation = details ?? { avatarUrl: null, bio: null };
  }

  return NextResponse.json({
    authenticated: true,
    profile: {
      id: sessionData.profile.id,
      username: sessionData.profile.username,
      displayName: sessionData.profile.displayName,
      ...(presentation ?? {}),
    },
    session: {
      id: sessionData.session.id,
      createdAt: sessionData.session.createdAt,
      expiresAt: sessionData.session.expiresAt,
      isTrusted: sessionData.session.isTrusted,
    },
  });
}