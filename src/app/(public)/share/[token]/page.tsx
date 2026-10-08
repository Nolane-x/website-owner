import React, { Suspense } from 'react';
import { UnlistedShareClient } from './share-client';

export const dynamic = 'force-dynamic';

export default async function UnlistedSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Suspense fallback={<div className="py-24 text-center text-xs font-mono text-[var(--text-muted)]">Đang giải mã liên kết chia sẻ...</div>}>
      <UnlistedShareClient token={token} />
    </Suspense>
  );
}
