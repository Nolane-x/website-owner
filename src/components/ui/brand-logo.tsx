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
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#C34812] via-[#A83707] to-[#7A2402] text-white shadow-md shadow-[#B9410C]/20 border border-white/20 overflow-hidden group transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Ambient Shimmer Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        
        {/* Geometric Emblem SVG */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5"
        >
          {/* Outer Archival Octagram Ring */}
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            className="opacity-60"
          />
          {/* Inner Geometric Shield */}
          <path
            d="M16 5L24 9.5V16.5C24 21.5 16 26.5 16 26.5C16 26.5 8 21.5 8 16.5V9.5L16 5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Center Monogram Anchor */}
          <path
            d="M13.5 13.5C13.5 12.1 14.6 11 16 11C17.4 11 18.5 12.1 18.5 13.5C18.5 14.9 17.4 16 16 16V19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="16" cy="21.5" r="1" fill="currentColor" />
        </svg>
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
