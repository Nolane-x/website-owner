import React, { Suspense } from 'react';
import { ProjectDetailClient } from './project-client';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">Đang tải dự án...</div>}>
      <ProjectDetailClient slug={slug} />
    </Suspense>
  );
}
