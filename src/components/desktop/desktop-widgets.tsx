'use client';

import React, { useState, useEffect } from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import {
  Inbox,
  CheckSquare,
  Lock,
  Code2,
  Image as ImageIcon,
  BookOpen,
  Activity,
  Cpu,
  Database,
  Quote,
} from 'lucide-react';

interface DesktopIconItem {
  appId: string;
  title: string;
  icon: React.ReactNode;
}

const DESKTOP_ICONS: DesktopIconItem[] = [
  {
    appId: 'inbox',
    title: 'Hộp thư Toàn năng',
    icon: <Inbox className="w-8 h-8 text-sky-400 group-hover:scale-110 transition-transform" />,
  },
  {
    appId: 'tasks',
    title: 'Bảng Kanban',
    icon: <CheckSquare className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />,
  },
  {
    appId: 'vault',
    title: 'Két bảo mật AES',
    icon: <Lock className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />,
  },
  {
    appId: 'devtools',
    title: 'Dev Power Lab',
    icon: <Code2 className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />,
  },
  {
    appId: 'wallpapers',
    title: 'Wallpaper Studio',
    icon: <ImageIcon className="w-8 h-8 text-teal-400 group-hover:scale-110 transition-transform" />,
  },
  {
    appId: 'research',
    title: 'Kho nghiên cứu',
    icon: <BookOpen className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />,
  },
];

export function DesktopWidgets() {
  const { openWindow } = useWindowManager();
  const [time, setTime] = useState<{ hours: string; minutes: string; seconds: string; date: string }>({
    hours: '12',
    minutes: '00',
    seconds: '00',
    date: 'Hôm nay',
  });

  const [fps, setFps] = useState(60);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime({
        hours: String(now.getHours()).padStart(2, '0'),
        minutes: String(now.getMinutes()).padStart(2, '0'),
        seconds: String(now.getSeconds()).padStart(2, '0'),
        date: now.toLocaleDateString('vi-VN', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Measure rough client render loop FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const loop = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none p-6 pt-14 pb-20 overflow-hidden flex flex-col justify-between">
      {/* Top row: Left Desktop Shortcuts & Right Live Widgets */}
      <div className="flex justify-between items-start w-full">
        {/* Desktop Application Icons Grid */}
        <div className="grid grid-cols-1 gap-4 pointer-events-auto">
          {DESKTOP_ICONS.map((icon) => (
            <button
              key={icon.appId}
              onDoubleClick={() => openWindow(icon.appId, icon.title)}
              onClick={() => {
                // Also single click on mobile or quick launch
              }}
              className="group flex flex-col items-center justify-center w-24 p-2 rounded-xl hover:bg-white/10 active:bg-white/20 backdrop-blur-xs border border-transparent hover:border-white/20 transition-all text-center focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
            >
              <div className="p-2.5 rounded-2xl bg-stone-900/60 border border-stone-700/50 shadow-lg group-hover:shadow-emerald-950/50 transition">
                {icon.icon}
              </div>
              <span className="mt-1.5 text-xs text-stone-200 font-medium tracking-wide drop-shadow-md truncate max-w-[88px]">
                {icon.title}
              </span>
            </button>
          ))}
        </div>

        {/* Right side: Digital Clock & System Telemetry */}
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          {/* Cyber Digital Clock */}
          <div className="backdrop-blur-xl bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 shadow-2xl flex flex-col items-end text-right min-w-[240px]">
            <div className="flex items-baseline font-mono text-4xl font-extrabold tracking-tighter text-white">
              <span className="text-emerald-400">{time.hours}</span>
              <span className="animate-pulse text-stone-500 mx-1">:</span>
              <span>{time.minutes}</span>
              <span className="text-xs text-stone-500 ml-2 font-normal font-sans">
                {time.seconds}s
              </span>
            </div>
            <p className="text-xs text-stone-400 capitalize mt-1 font-medium">{time.date}</p>
          </div>

          {/* Telemetry Gauge Card */}
          <div className="backdrop-blur-xl bg-stone-950/60 border border-stone-800/80 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2 min-w-[240px] text-xs">
            <div className="flex items-center justify-between text-stone-300 font-semibold border-b border-stone-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                <span>Hiệu năng hệ thống</span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">Live</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="flex items-center gap-1.5 text-stone-400">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Tốc độ khung hình:</span>
              </div>
              <span className="font-mono text-right text-stone-200 font-semibold">
                {fps} FPS
              </span>

              <div className="flex items-center gap-1.5 text-stone-400">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Cơ sở dữ liệu:</span>
              </div>
              <span className="font-mono text-right text-emerald-400 font-semibold">
                PGlite WASM
              </span>
            </div>
          </div>

          {/* Daily Thought / Affirmation */}
          <div className="backdrop-blur-xl bg-stone-950/50 border border-stone-800/70 rounded-2xl p-3 shadow-xl max-w-[280px] text-xs text-stone-400 italic">
            <div className="flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                &ldquo;Tập trung vào giá trị cốt lõi, loại bỏ xao nhãng và tạo ra sản phẩm xuất sắc.&rdquo;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
