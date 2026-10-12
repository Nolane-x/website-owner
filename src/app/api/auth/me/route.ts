import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

function unavailableResponse() {
  return NextResponse.json(
    {
      authenticated: false,
      error: 'Tạm thời không thể xác minh phiên đăng nhập. Hãy thử lại sau.',
      code: 'AUTH_SERVICE_UNAVAILABLE',
    },
    { status: 503, headers: NO_STORE_HEADERS },
  );
}

export async function GET(req: NextRequest) {
  try {
    // A database/quota outage is not proof that a session is invalid.
    // Keep it distinct from an actual missing or expired authentication cookie.
    const sessionData = await getSessionFromCookies();
    if (!sessionData) {
      return NextResponse.json(
        { authenticated: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' },
        { status: 401, headers: NO_STORE_HEADERS },
      );
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
    }, { headers: NO_STORE_HEADERS });
  } catch {
    // Never expose a raw database/driver error or connection details to clients.
    console.error('Authentication session verification temporarily unavailable');
    return unavailableResponse();
  }
}
