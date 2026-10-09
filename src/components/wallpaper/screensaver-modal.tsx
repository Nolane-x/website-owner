'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CanvasShaders, ShaderMode } from './canvas-shaders';
import { Clock, Moon } from 'lucide-react';

interface ScreensaverModalProps {
  isOpen: boolean;
  onClose: () => void;
  shaderMode?: ShaderMode;
}

export function ScreensaverModal({
  isOpen,
  onClose,
  shaderMode = 'starfield',
}: ScreensaverModalProps) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Update clock
  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Wake up listeners (any key, mousemove with threshold, click)
  useEffect(() => {
    if (!isOpen) return;

    let moveCount = 0;
    const handleKeyDown = () => onClose();
    const handleClick = () => onClose();
    const handleMouseMove = () => {
      moveCount++;
      if (moveCount > 5) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-12 select-none cursor-none animate-in fade-in duration-500">
      {/* Background canvas shader */}
      <CanvasShaders mode={shaderMode} className="opacity-80" />

      {/* Top tiny info */}
      <div className="flex items-center gap-2 text-stone-500 text-xs tracking-widest uppercase font-mono z-10">
        <Moon className="w-4 h-4 text-emerald-400" />
        <span>Personal Web OS 5.0 — Chế độ chờ (Screensaver)</span>
      </div>

      {/* Center Giant Cyber Clock */}
      <div className="flex flex-col items-center z-10 text-center">
        <h1 className="font-mono text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 tracking-tighter drop-shadow-2xl">
          {timeStr || '00:00:00'}
        </h1>
        <p className="text-stone-400 text-lg sm:text-xl font-medium capitalize mt-4 tracking-wide">
          {dateStr}
        </p>
      </div>

      {/* Bottom hint */}
      <div className="text-stone-500 text-xs font-mono tracking-wider animate-pulse z-10">
        Di chuyển chuột hoặc nhấn phím bất kỳ để tiếp tục
      </div>
    </div>
  );
}
