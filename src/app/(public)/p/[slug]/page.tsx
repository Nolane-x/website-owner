import React, { Suspense } from 'react';
import { CanvasPageClient } from './p-client';

export const dynamic = 'force-dynamic';

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">Đang tải trang Canvas...</div>}>
      <CanvasPageClient slug={slug} />
    </Suspense>
  );
}
