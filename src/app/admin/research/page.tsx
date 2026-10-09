'use client';

import React from 'react';
import { ResearchApp } from '@/components/desktop/apps/research-app';

export default function AdminResearchPage() {
  return (
    <div className="h-[calc(100vh-140px)] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
      <ResearchApp />
    </div>
  );
}
