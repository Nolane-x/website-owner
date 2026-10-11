'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { CalculatorApp } from '@/components/desktop/apps/calculator-app';

export default function OwnerCalculatorPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)]">
            <ArrowLeft size={13} /> Bảng điều khiển
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Máy tính khoa học riêng</h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Công cụ dành cho chủ sở hữu; xử lý ngay trong trình duyệt, không gửi biểu thức lên máy chủ.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-semibold text-emerald-600">
          <ShieldCheck size={13} /> Local-only
        </span>
      </div>
      <div className="h-[min(72vh,820px)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
        <CalculatorApp />
      </div>
    </div>
  );
}
