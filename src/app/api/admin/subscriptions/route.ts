import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { SubscriptionCategory, BillingCycle, SubscriptionStatus } from '@/lib/types';

export async function GET() {
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    await initializeDatabase();
    const db = getDb();

    const items = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.profileId, auth.profile.id))
      .orderBy(desc(subscriptions.createdAt));

    let monthlyTotalVnd = 0;
    let monthlyTotalUsd = 0;
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingCount = 0;

    for (const item of items) {
      if (item.status === 'active') {
        const costPerMonth = item.billingCycle === 'yearly' ? Math.round(item.cost / 12) : item.cost;
        if (item.currency === 'USD') {
          monthlyTotalUsd += costPerMonth;
        } else {
          monthlyTotalVnd += costPerMonth;
        }

        const billingDate = new Date(item.nextBillingDate);
        if (!isNaN(billingDate.getTime()) && billingDate >= now && billingDate <= next7Days) {
          upcomingCount++;
        }
      }
    }

    return NextResponse.json({
      subscriptions: items,
      metrics: {
        monthlyTotalVnd,
        monthlyTotalUsd,
        upcomingCount,
        totalActive: items.filter((i) => i.status === 'active').length,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách chi phí dịch vụ:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách chi phí dịch vụ.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Tên dịch vụ là bắt buộc.' }, { status: 400 });
    }

    const category: SubscriptionCategory = body.category || 'infrastructure';
    const cost = Math.max(0, Number(body.cost) || 0);
    const currency: 'VND' | 'USD' = body.currency === 'USD' ? 'USD' : 'VND';
    const billingCycle: BillingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const nextBillingDate = sanitizePlain(body.nextBillingDate || new Date().toISOString().split('T')[0]);
    const status: SubscriptionStatus = body.status || 'active';
    const url = body.url ? sanitizePlain(body.url) : null;
    const notes = body.notes ? sanitizePlain(body.notes) : null;

    const newSub = {
      id: 'sub-' + crypto.randomUUID(),
      profileId: auth.profile.id,
      name,
      category,
      cost,
      currency,
      billingCycle,
      nextBillingDate,
      status,
      url,
      notes,
    };

    await db.insert(subscriptions).values(newSub);

    const [created] = await db.select().from(subscriptions).where(eq(subscriptions.id, newSub.id));
    return NextResponse.json({ subscription: created }, { status: 201 });
  } catch (error) {
    console.error('Lỗi tạo dịch vụ chi phí:', error);
    return NextResponse.json({ error: 'Không thể tạo dịch vụ chi phí mới.' }, { status: 500 });
  }
}
