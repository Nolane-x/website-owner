import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { crmContacts } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const contacts = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.profileId, auth.profile.id))
      .orderBy(desc(crmContacts.createdAt));

    const now = Date.now();
    const enriched = contacts.map(c => {
      let isOverdue = false;
      if (c.lastInteractionAt) {
        const last = new Date(c.lastInteractionAt).getTime();
        const diffDays = (now - last) / (1000 * 60 * 60 * 24);
        if (diffDays > c.followUpDays) {
          isOverdue = true;
        }
      } else {
        isOverdue = true;
      }
      return { ...c, isOverdue };
    });

    return NextResponse.json({ contacts: enriched });
  } catch (error) {
    console.error('Lỗi lấy danh bạ CRM:', error);
    return NextResponse.json({ error: 'Không thể tải danh bạ quan hệ.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = assertValidOrigin(req);
  if (originErr) return originErr;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const name = sanitizePlain(body.name || '');
    if (!name) {
      return NextResponse.json({ error: 'Tên liên hệ là bắt buộc.' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();
    const contactData = {
      id,
      profileId: auth.profile.id,
      name,
      role: sanitizePlain(body.role || ''),
      organization: body.organization ? sanitizePlain(body.organization) : null,
      category: body.category || 'colleague',
      email: body.email ? sanitizePlain(body.email) : null,
      phone: body.phone ? sanitizePlain(body.phone) : null,
      lastInteractionAt: body.lastInteractionAt || new Date().toISOString().split('T')[0],
      followUpDays: Number(body.followUpDays) || 14,
      notes: body.notes ? sanitizePlain(body.notes) : null,
      neverCloudAi: Boolean(body.neverCloudAi),
    };

    if (body.id) {
      await db
        .update(crmContacts)
        .set(contactData)
        .where(and(eq(crmContacts.id, body.id), eq(crmContacts.profileId, auth.profile.id)));
    } else {
      await db.insert(crmContacts).values({
        ...contactData,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ contact: contactData }, { status: 200 });
  } catch (error) {
    console.error('Lỗi lưu liên hệ CRM:', error);
    return NextResponse.json({ error: 'Không thể lưu liên hệ.' }, { status: 500 });
  }
}
