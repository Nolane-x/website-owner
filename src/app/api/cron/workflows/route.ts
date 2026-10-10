import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';
import { runDailyScheduledOverdueReports } from '@/lib/workflows/scheduler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;

  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;

  const provided = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 16) {
    return NextResponse.json(
      { error: 'Scheduler chưa được cấu hình: hãy thêm CRON_SECRET (tối thiểu 16 ký tự) vào môi trường Production.' },
      { status: 503 },
    );
  }
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Không được phép gọi scheduler.' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const result = await runDailyScheduledOverdueReports(getDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Lỗi cron workflow scheduler:', error);
    return NextResponse.json({ error: 'Không thể chạy scheduler workflow.' }, { status: 500 });
  }
}
