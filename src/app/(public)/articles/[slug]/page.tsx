import React, { Suspense } from 'react';
import { ArticleDetailClient } from './article-client';

export const dynamic = 'force-dynamic';

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">Đang tải bài viết...</div>}>
      <ArticleDetailClient slug={slug} />
    </Suspense>
  );
}
