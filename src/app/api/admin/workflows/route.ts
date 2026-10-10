import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { compileWorkflowGraph } from '@/lib/workflows/compiler';
import type { WorkflowEdge, WorkflowNode } from '@/lib/types';

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
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ.' }, { status: 400 });
    }
    if (Object.prototype.hasOwnProperty.call(body, 'scheduleEnabled') && typeof body.scheduleEnabled !== 'boolean') {
      return NextResponse.json({ error: 'scheduleEnabled phải là boolean.' }, { status: 400 });
    }
    if (body.scheduleEnabled === true && body.triggerType !== 'overdue_report') {
      return NextResponse.json({ error: 'Chỉ workflow báo cáo quá hạn (chỉ đọc) được bật lịch tự động.' }, { status: 400 });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'nodes') && !Array.isArray(body.nodes)) {
      return NextResponse.json({ error: 'nodes phải là một mảng.' }, { status: 400 });
    }
    if (Object.prototype.hasOwnProperty.call(body, 'edges') && !Array.isArray(body.edges)) {
      return NextResponse.json({ error: 'edges phải là một mảng.' }, { status: 400 });
    }
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const edges = Array.isArray(body.edges) ? body.edges : [];
    const compilation = compileWorkflowGraph(nodes, edges);
    if (!compilation.valid) {
      return NextResponse.json({
        error: 'Đồ thị workflow không hợp lệ nên chưa được lưu.',
        details: compilation.errors,
      }, { status: 400 });
    }

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
      nodesJson: nodes as unknown as WorkflowNode[],
      edgesJson: edges as unknown as WorkflowEdge[],
      isActive: body.isActive !== false,
      scheduleEnabled: body.scheduleEnabled === true,
      updatedAt: new Date(),
    };

    if (body.id) {
      if (typeof body.id !== 'string' || !body.id.trim()) {
        return NextResponse.json({ error: 'ID workflow không hợp lệ.' }, { status: 400 });
      }
      const [existing] = await db.select()
        .from(automationWorkflows)
        .where(and(eq(automationWorkflows.id, body.id), eq(automationWorkflows.profileId, auth.profile.id)))
        .limit(1);
      if (!existing) {
        return NextResponse.json({ error: 'Không tìm thấy workflow thuộc tài khoản này.' }, { status: 404 });
      }
      const scheduleEnabled = typeof body.scheduleEnabled === 'boolean'
        ? body.scheduleEnabled
        : existing.scheduleEnabled;
      if (scheduleEnabled && workflowData.triggerType !== 'overdue_report') {
        return NextResponse.json({ error: 'Hãy tắt lịch tự động trước khi đổi trigger sang loại khác.' }, { status: 400 });
      }
      await db
        .update(automationWorkflows)
        .set({ ...workflowData, scheduleEnabled })
        .where(and(eq(automationWorkflows.id, body.id), eq(automationWorkflows.profileId, auth.profile.id)));
      const [updated] = await db.select().from(automationWorkflows)
        .where(and(eq(automationWorkflows.id, body.id), eq(automationWorkflows.profileId, auth.profile.id)))
        .limit(1);
      if (!updated) {
        return NextResponse.json({ error: 'Không thể xác minh workflow sau khi cập nhật.' }, { status: 500 });
      }
      return NextResponse.json({ workflow: updated }, { status: 200 });
    }

    await db.insert(automationWorkflows).values({
      ...workflowData,
      createdAt: new Date(),
    });
    const [created] = await db.select().from(automationWorkflows)
      .where(and(eq(automationWorkflows.id, workflowData.id), eq(automationWorkflows.profileId, auth.profile.id)))
      .limit(1);
    if (!created) {
      return NextResponse.json({ error: 'Không thể xác minh workflow sau khi tạo.' }, { status: 500 });
    }
    return NextResponse.json({ workflow: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi lưu workflow:', error);
    return NextResponse.json({ error: 'Không thể lưu quy trình.' }, { status: 500 });
  }
}
