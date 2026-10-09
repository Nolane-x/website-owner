import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const workflows = await db
      .select()
      .from(automationWorkflows)
      .where(eq(automationWorkflows.profileId, auth.profile.id))
      .orderBy(desc(automationWorkflows.createdAt));

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('Lỗi lấy danh sách workflows:', error);
    return NextResponse.json({ error: 'Không thể tải quy trình tự động hóa.' }, { status: 500 });
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

    const name = sanitizePlain(body.name || '');
    if (!name) {
      return NextResponse.json({ error: 'Tên quy trình là bắt buộc.' }, { status: 400 });
    }

    const id = body.id || crypto.randomUUID();
    const workflowData = {
      id,
      profileId: auth.profile.id,
      name,
      description: body.description ? sanitizePlain(body.description) : null,
      triggerType: body.triggerType || 'manual',
      nodesJson: Array.isArray(body.nodes) ? body.nodes : [],
      edgesJson: Array.isArray(body.edges) ? body.edges : [],
      isActive: body.isActive !== false,
      updatedAt: new Date(),
    };

    if (body.id) {
      await db
        .update(automationWorkflows)
        .set(workflowData)
        .where(eq(automationWorkflows.id, body.id));
    } else {
      await db.insert(automationWorkflows).values({
        ...workflowData,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ workflow: workflowData }, { status: 200 });
  } catch (error) {
    console.error('Lỗi lưu workflow:', error);
    return NextResponse.json({ error: 'Không thể lưu quy trình.' }, { status: 500 });
  }
}
