import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { researchSources } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { ResearchSourceStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ResearchSourceStatus | null;

    const conditions = [eq(researchSources.profileId, auth.profile.id)];
    if (status) {
      conditions.push(eq(researchSources.status, status));
    }

    const sources = await db
      .select()
      .from(researchSources)
      .where(and(...conditions))
      .orderBy(desc(researchSources.createdAt));

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Lỗi lấy danh sách tài liệu nghiên cứu:', error);
    return NextResponse.json({ error: 'Không thể tải tài liệu nghiên cứu.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await assertValidOrigin(req);
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề tài liệu là bắt buộc.' }, { status: 400 });
    }

    const url = body.url ? sanitizePlain(body.url) : null;
    const author = body.author ? sanitizePlain(body.author) : null;
    const excerpt = body.excerpt ? sanitizePlain(body.excerpt) : null;
    const status: ResearchSourceStatus = body.status || 'captured';
    const tagsJson: string[] = Array.isArray(body.tagsJson)
      ? body.tagsJson.map((t: string) => sanitizePlain(t))
      : [];

    const id = 'src-' + crypto.randomUUID();

    await db.insert(researchSources).values({
      id,
      profileId: auth.profile.id,
      title,
      url,
      author,
      excerpt,
      status,
      tagsJson,
      createdAt: new Date(),
    });

    const [created] = await db.select().from(researchSources).where(eq(researchSources.id, id));
    return NextResponse.json({ source: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi thêm tài liệu nghiên cứu:', error);
    return NextResponse.json({ error: 'Không thể thêm tài liệu nghiên cứu.' }, { status: 500 });
  }
}
