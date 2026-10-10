import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflows } from '@/lib/db/schema';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { compileWorkflowGraph } from '@/lib/workflows/compiler';

export async function POST(req: NextRequest) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Nội dung yêu cầu không hợp lệ.' }, { status: 400 });
    }

    const workflowId = (body as { workflowId?: unknown }).workflowId;
    if (typeof workflowId !== 'string' || !workflowId.trim() || workflowId.length > 200) {
      return NextResponse.json({ error: 'workflowId không hợp lệ.' }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDb();
    const [workflow] = await db.select().from(automationWorkflows).where(and(
      eq(automationWorkflows.id, workflowId),
      eq(automationWorkflows.profileId, auth.profile.id),
    )).limit(1);

    if (!workflow) {
      return NextResponse.json({ error: 'Không tìm thấy workflow thuộc tài khoản này.' }, { status: 404 });
    }

    const compilation = compileWorkflowGraph(workflow.nodesJson, workflow.edgesJson);
    return NextResponse.json({
      workflowId: workflow.id,
      workflowName: workflow.name,
      compilation,
      executionCapability: workflow.triggerType === 'inbox_to_task' || workflow.triggerType === 'overdue_report'
        ? 'bounded_trigger_executor'
        : 'unsupported_trigger',
      note: 'Biên dịch xác minh cấu trúc và thứ tự node; điều này không đồng nghĩa tất cả loại node/action đã có executor.',
    }, { status: compilation.valid ? 200 : 422 });
  } catch (error) {
    console.error('Lỗi biên dịch workflow:', error);
    return NextResponse.json({ error: 'Không thể biên dịch workflow.' }, { status: 500 });
  }
}
