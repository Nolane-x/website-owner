import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { automationWorkflowRuns } from '@/lib/db/schema';
import { reconcileStaleWorkflowRuns } from '@/lib/workflows/run-history';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  const params = req.nextUrl.searchParams;
  const workflowId = params.get('workflowId');
  const rawLimit = params.get('limit');
  let limit = DEFAULT_LIMIT;

  if (workflowId !== null && (!workflowId.trim() || workflowId.length > 200)) {
    return NextResponse.json({ error: 'workflowId không hợp lệ.' }, { status: 400 });
  }
  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit)) {
      return NextResponse.json({ error: 'limit phải là số nguyên dương.' }, { status: 400 });
    }
    const parsedLimit = Number(rawLimit);
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      return NextResponse.json({ error: `limit phải nằm trong khoảng 1–${MAX_LIMIT}.` }, { status: 400 });
    }
    limit = parsedLimit;
  }

  try {
    await initializeDatabase();
    const db = getDb();
    await reconcileStaleWorkflowRuns(db, auth.profile.id);
    const conditions = [eq(automationWorkflowRuns.profileId, auth.profile.id)];
    if (workflowId) conditions.push(eq(automationWorkflowRuns.workflowId, workflowId));
    const runs = await db.select()
      .from(automationWorkflowRuns)
      .where(and(...conditions))
      .orderBy(desc(automationWorkflowRuns.createdAt))
      .limit(limit);

    return NextResponse.json({ runs, limit, hasMore: runs.length === limit });
  } catch (error) {
    console.error('Lỗi lấy lịch sử workflow:', error);
    return NextResponse.json({ error: 'Không thể tải lịch sử chạy workflow.' }, { status: 500 });
  }
}
