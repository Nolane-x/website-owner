import React, { Suspense } from 'react';
import { PublicShell } from '@/components/layout/public-shell';

export const dynamic = 'force-dynamic';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <PublicShell>{children}</PublicShell>
    </Suspense>
  );
}
