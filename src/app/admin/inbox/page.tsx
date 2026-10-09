'use client';

import React from 'react';
import { InboxApp } from '@/components/desktop/apps/inbox-app';

export default function AdminInboxPage() {
  return (
    <div className="h-[calc(100vh-140px)] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
      <InboxApp />
    </div>
  );
}
