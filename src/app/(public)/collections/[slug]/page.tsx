import React, { Suspense } from 'react';
import { CollectionDetailClient } from './collection-client';

export const dynamic = 'force-dynamic';

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">Đang tải bộ sưu tập...</div>}>
      <CollectionDetailClient slug={slug} />
    </Suspense>
  );
}
