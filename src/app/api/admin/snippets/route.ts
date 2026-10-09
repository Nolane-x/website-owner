import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { codeSnippets } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();
    const language = searchParams.get('language');

    let all = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.profileId, auth.profile.id))
      .orderBy(desc(codeSnippets.isFavorite), desc(codeSnippets.updatedAt));

    if (language) {
      all = all.filter((s) => s.language.toLowerCase() === language.toLowerCase());
    }

    if (search) {
      all = all.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          (s.description && s.description.toLowerCase().includes(search)) ||
          s.code.toLowerCase().includes(search) ||
          s.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ snippets: all });
  } catch (err) {
    console.error('Lỗi truy vấn Code Snippets:', err);
    return NextResponse.json(
      { error: 'Không thể tải danh sách đoạn mã' },
      { status: 500 }
    );
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
    const { title, description, language, code, tags, isFavorite } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề đoạn mã là bắt buộc' }, { status: 400 });
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Nội dung mã nguồn không được để trống' }, { status: 400 });
    }

    const newSnippet = {
      id: crypto.randomUUID(),
      profileId: auth.profile.id,
      title: sanitizePlain(title.trim()),
      description: description ? sanitizePlain(String(description).trim()) : null,
      language: sanitizePlain((language || 'typescript').toLowerCase().trim()),
      code,
      tags: Array.isArray(tags) ? tags.map((t: unknown) => sanitizePlain(String(t).trim())) : [],
      isFavorite: Boolean(isFavorite),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(codeSnippets).values(newSnippet);

    return NextResponse.json({ snippet: newSnippet }, { status: 201 });
  } catch (err) {
    console.error('Lỗi tạo Code Snippet mới:', err);
    return NextResponse.json(
      { error: 'Không thể lưu đoạn mã mới' },
      { status: 500 }
    );
  }
}
