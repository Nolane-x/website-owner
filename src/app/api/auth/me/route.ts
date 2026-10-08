import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET() {
  const sessionData = await getSessionFromCookies();
  if (!sessionData) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    profile: {
      id: sessionData.profile.id,
      username: sessionData.profile.username,
      displayName: sessionData.profile.displayName,
      avatarUrl: sessionData.profile.avatarUrl,
      bio: sessionData.profile.bio,
    },
    session: {
      id: sessionData.session.id,
      createdAt: sessionData.session.createdAt,
      expiresAt: sessionData.session.expiresAt,
      isTrusted: sessionData.session.isTrusted,
    },
  });
}
