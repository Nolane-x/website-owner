import React, { Suspense } from 'react';
import { BuilderCanvasClient } from './builder-client';

export const dynamic = 'force-dynamic';

export default async function PageCanvasBuilder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">Đang tải Trình dựng khối...</div>}>
      <BuilderCanvasClient pageId={id} />
    </Suspense>
  );
}
