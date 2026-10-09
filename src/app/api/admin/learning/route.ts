import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { learningCards } from '@/lib/db/schema';
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

    const cards = await db
      .select()
      .from(learningCards)
      .where(eq(learningCards.profileId, auth.profile.id))
      .orderBy(desc(learningCards.createdAt));

    const today = new Date().toISOString().split('T')[0];
    const dueCards = cards.filter(c => c.nextReviewDate <= today);

    return NextResponse.json({
      cards,
      dueCount: dueCards.length,
      totalCount: cards.length,
    });
  } catch (error) {
    console.error('Lỗi lấy dữ liệu Learning Lab:', error);
    return NextResponse.json({ error: 'Không thể tải thẻ học tập.' }, { status: 500 });
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

    // Trường hợp 1: Đánh giá thẻ ôn tập (Review card: Again=1, Hard=2, Good=3, Easy=4)
    if (body.action === 'review' && body.cardId) {
      const rating = Number(body.rating);
      if (![1, 2, 3, 4].includes(rating)) {
        return NextResponse.json({ error: 'Đánh giá ôn tập không hợp lệ (1-4).' }, { status: 400 });
      }

      const existing = await db
        .select()
        .from(learningCards)
        .where(and(eq(learningCards.id, body.cardId), eq(learningCards.profileId, auth.profile.id)))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy thẻ.' }, { status: 404 });
      }

      const card = existing[0];
      let { intervalDays, repetitions, easeFactor } = card;

      if (rating === 1) { // Again
        repetitions = 0;
        intervalDays = 1;
        easeFactor = Math.max(130, easeFactor - 20);
      } else if (rating === 2) { // Hard
        repetitions += 1;
        intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
        easeFactor = Math.max(130, easeFactor - 15);
      } else if (rating === 3) { // Good
        if (repetitions === 0) intervalDays = 1;
        else if (repetitions === 1) intervalDays = 6;
        else intervalDays = Math.round(intervalDays * (easeFactor / 100));
        repetitions += 1;
      } else if (rating === 4) { // Easy
        if (repetitions === 0) intervalDays = 4;
        else intervalDays = Math.round(intervalDays * (easeFactor / 100) * 1.3);
        repetitions += 1;
        easeFactor += 15;
      }

      const nextDate = new Date(Date.now() + intervalDays * 86400000).toISOString().split('T')[0];

      await db
        .update(learningCards)
        .set({
          intervalDays,
          repetitions,
          easeFactor,
          nextReviewDate: nextDate,
        })
        .where(and(eq(learningCards.id, card.id), eq(learningCards.profileId, auth.profile.id)));

      return NextResponse.json({ success: true, nextReviewDate: nextDate, intervalDays });
    }

    // Trường hợp 2: Thêm thẻ mới
    const front = sanitizePlain(body.front || '');
    const back = sanitizePlain(body.back || '');
    if (!front || !back) {
      return NextResponse.json({ error: 'Mặt trước và mặt sau là bắt buộc.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const today = new Date().toISOString().split('T')[0];
    const newCard = {
      id,
      profileId: auth.profile.id,
      deckName: sanitizePlain(body.deckName || 'Mặc định'),
      front,
      back,
      difficulty: 1,
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 250,
      nextReviewDate: today,
      createdAt: new Date(),
    };

    await db.insert(learningCards).values(newCard);
    return NextResponse.json({ card: newCard }, { status: 201 });
  } catch (error) {
    console.error('Lỗi lưu thẻ học:', error);
    return NextResponse.json({ error: 'Không thể lưu thẻ học.' }, { status: 500 });
  }
}
