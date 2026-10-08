import React, { Suspense } from 'react';
import { AdminShell } from '@/components/layout/admin-shell';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
