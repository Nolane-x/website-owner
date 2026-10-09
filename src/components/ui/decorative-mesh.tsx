'use client';

import React from 'react';

interface DecorativeMeshProps {
  className?: string;
}

export function DecorativeMesh({ className = '' }: DecorativeMeshProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden select-none -z-10 ${className}`}>
      {/* 1. Subtle warm ambient light orb (top right) */}
      <div 
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#B9410C]/12 via-[#E66828]/6 to-transparent blur-3xl transform-gpu animate-float"
        style={{ animationDuration: '8s' }}
      />

      {/* 2. Secondary cool amber/gold ambient glow (bottom left) */}
      <div 
        className="absolute top-1/2 -left-48 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-[#D97706]/10 via-[#B9410C]/5 to-transparent blur-3xl transform-gpu animate-float"
        style={{ animationDuration: '11s', animationDelay: '-3s' }}
      />

      {/* 3. Archival Grid Overlay with tick marks */}
      <div className="absolute inset-0 bg-grid-warm opacity-70 mask-radial" />

      {/* 4. Editorial corner coordinates / framing brackets */}
      <div className="absolute top-8 left-8 flex items-center gap-2 opacity-30 text-[10px] font-mono text-[var(--text-muted)] hidden md:flex">
        <span>[21°01&apos;N 105°51&apos;E]</span>
        <span>·</span>
        <span>SYS.OS_RELEASE_2026</span>
      </div>

      <div className="absolute top-8 right-8 flex items-center gap-2 opacity-30 text-[10px] font-mono text-[var(--text-muted)] hidden md:flex">
        <span>SECURITY_LEVEL: AIRGAP_SECURE</span>
        <span>·</span>
        <span>MODE: SOVEREIGN</span>
      </div>
    </div>
  );
}
