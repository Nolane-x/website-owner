'use client';

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  withText?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  className = '',
  size = 36,
  withText = true,
  subtitle = 'Personal Web OS',
}: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Monogram Seal Icon */}
      <div 
        className="relative flex items-center justify-center rounded-xl overflow-hidden group transition-transform duration-300 hover:scale-105 shadow-md shadow-[#B9410C]/25 border border-amber-500/30 bg-black"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.jpg"
          alt="Personal Web OS Emblem"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl" />
      </div>

      {withText && (
        <div className="flex flex-col text-left">
          <span className="font-serif font-bold text-base tracking-tight text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
            <span>Chủ Sở Hữu</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Hệ thống hoạt động" />
          </span>
          {subtitle && (
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
