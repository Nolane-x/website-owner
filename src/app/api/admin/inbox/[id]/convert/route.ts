import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guard';
import { getDb, initializeDatabase } from '@/lib/db';
import { assertValidOrigin } from '@/lib/security/origin-guard';
import { convertInboxItemToTask } from '@/lib/workflows/convert-inbox';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originError = assertValidOrigin(req);
  if (originError) return originError;
  const auth = await requireOwner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;
    if (!id || id.length > 200) {
      return NextResponse.json({ error: 'ID mục Inbox không hợp lệ.' }, { status: 400 });
    }

    await initializeDatabase();
    const conversion = await convertInboxItemToTask(getDb(), auth.profile.id, id);
    if (conversion.status === 'not_found') {
      return NextResponse.json(
        { error: 'Không tìm thấy mục Inbox thuộc tài khoản này.' },
        { status: 404 },
      );
    }

    const idempotentReplay = conversion.status === 'reused';
    return NextResponse.json({
      success: true,
      status: conversion.status,
      inboxItemId: conversion.inboxItemId,
      task: conversion.task,
      idempotentReplay,
      message: idempotentReplay
        ? 'Task đã tồn tại; đã tái sử dụng, không tạo trùng.'
        : 'Task đã được tạo và liên kết nguyên tử với mục Inbox.',
    });
  } catch (error) {
    console.error('Không thể chuyển Inbox thành Task:', error);
    return NextResponse.json({ error: 'Không thể chuyển mục Inbox thành công việc.' }, { status: 500 });
  }
}
