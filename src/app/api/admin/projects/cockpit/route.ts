import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { projectGoals, decisionRecords, kanbanTasks, contentItems } from '@/lib/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const [goals, decisions, tasks, projects] = await Promise.all([
      db.select().from(projectGoals).where(eq(projectGoals.profileId, auth.profile.id)).orderBy(desc(projectGoals.createdAt)),
      db.select().from(decisionRecords).where(eq(decisionRecords.profileId, auth.profile.id)).orderBy(desc(decisionRecords.createdAt)),
      db.select().from(kanbanTasks).where(eq(kanbanTasks.profileId, auth.profile.id)),
      db.select().from(contentItems).where(and(eq(contentItems.profileId, auth.profile.id), eq(contentItems.type, 'project'), isNull(contentItems.deletedAt))),
    ]);

    // Tính toán sức khỏe dự án minh bạch (Transparent Health Score)
    const now = new Date();
    const overdueCount = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      const dueTime = t.dueDate.length === 10 ? new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999) : due;
      return dueTime < now;
    }).length;
    const blockedCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const totalTasks = tasks.length || 1;
    const velocity = Math.round((completedTasks / totalTasks) * 100);

    let score = 100 - (overdueCount * 15) - (blockedCount * 20);
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    const health = {
      score,
      overdueCount,
      blockedCount,
      velocity,
      status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
    };

    return NextResponse.json({
      goals,
      decisions,
      projects,
      health,
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu Project Cockpit:', error);
    return NextResponse.json({ error: 'Không thể tải dữ liệu Project Cockpit.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const originErr = await assertValidOrigin(req);
  if (originErr) return originErr;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const title = sanitizePlain(body.title || '');
    if (!title) {
      return NextResponse.json({ error: 'Tiêu đề mục tiêu là bắt buộc.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const newGoal = {
      id,
      profileId: auth.profile.id,
      title,
      description: body.description ? sanitizePlain(body.description) : null,
      category: body.category || 'delivery',
      targetDate: body.targetDate || new Date().toISOString().split('T')[0],
      status: body.status || 'active',
      progress: typeof body.progress === 'number' ? Math.min(100, Math.max(0, body.progress)) : 0,
      createdAt: new Date(),
    };

    await db.insert(projectGoals).values(newGoal);
    return NextResponse.json({ goal: newGoal }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo mục tiêu dự án:', error);
    return NextResponse.json({ error: 'Không thể tạo mục tiêu.' }, { status: 500 });
  }
}
