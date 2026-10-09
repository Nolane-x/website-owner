import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizePlain } from '@/lib/security/sanitize';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { SubscriptionCategory, BillingCycle, SubscriptionStatus } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.profileId, auth.profile.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy dịch vụ chi phí.' }, { status: 404 });
    }

    const updates: Partial<typeof subscriptions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updates.name = sanitizePlain(body.name);
    if (body.category !== undefined) updates.category = body.category as SubscriptionCategory;
    if (body.cost !== undefined) updates.cost = Math.max(0, Number(body.cost));
    if (body.currency !== undefined) updates.currency = body.currency === 'USD' ? 'USD' : 'VND';
    if (body.billingCycle !== undefined) updates.billingCycle = body.billingCycle as BillingCycle;
    if (body.nextBillingDate !== undefined) updates.nextBillingDate = sanitizePlain(body.nextBillingDate);
    if (body.status !== undefined) updates.status = body.status as SubscriptionStatus;
    if (body.url !== undefined) updates.url = body.url ? sanitizePlain(body.url) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizePlain(body.notes) : null;

    await db
      .update(subscriptions)
      .set(updates)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.profileId, auth.profile.id)));

    const [updated] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.profileId, auth.profile.id)));

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error('Lỗi cập nhật dịch vụ chi phí:', error);
    return NextResponse.json({ error: 'Không thể cập nhật dịch vụ chi phí.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    await initializeDatabase();
    const db = getDb();

    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.profileId, auth.profile.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi xóa dịch vụ chi phí:', error);
    return NextResponse.json({ error: 'Không thể xóa dịch vụ chi phí.' }, { status: 500 });
  }
}
