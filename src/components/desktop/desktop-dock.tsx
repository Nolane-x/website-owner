'use client';

import React from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import {
  Inbox,
  CheckSquare,
  Lock,
  Code2,
  FileText,
  Terminal,
  Radio,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Sliders,
  Layers,
} from 'lucide-react';

interface DockApp {
  appId: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const DOCK_APPS: DockApp[] = [
  {
    appId: 'inbox',
    title: 'Universal Inbox',
    icon: <Inbox className="w-5 h-5 text-sky-400" />,
    color: 'hover:bg-sky-500/20',
  },
  {
    appId: 'tasks',
    title: 'Kanban Tasks',
    icon: <CheckSquare className="w-5 h-5 text-emerald-400" />,
    color: 'hover:bg-emerald-500/20',
  },
  {
    appId: 'vault',
    title: 'Két mật mã Zero-Knowledge',
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    color: 'hover:bg-amber-500/20',
  },
  {
    appId: 'devtools',
    title: 'Developer Power Lab',
    icon: <Code2 className="w-5 h-5 text-indigo-400" />,
    color: 'hover:bg-indigo-500/20',
  },
  {
    appId: 'notes',
    title: 'Scratchpad Notes',
    icon: <FileText className="w-5 h-5 text-yellow-400" />,
    color: 'hover:bg-yellow-500/20',
  },
  {
    appId: 'snippets',
    title: 'Code Snippets Vault',
    icon: <Terminal className="w-5 h-5 text-emerald-400" />,
    color: 'hover:bg-emerald-500/20',
  },
  {
    appId: 'music',
    title: 'Sound Lab & Lo-Fi',
    icon: <Radio className="w-5 h-5 text-rose-400" />,
    color: 'hover:bg-rose-500/20',
  },
  {
    appId: 'wallpapers',
    title: 'Wallpaper Studio',
    icon: <ImageIcon className="w-5 h-5 text-teal-400" />,
    color: 'hover:bg-teal-500/20',
  },
  {
    appId: 'research',
    title: 'Kho nghiên cứu & Claims',
    icon: <BookOpen className="w-5 h-5 text-cyan-400" />,
    color: 'hover:bg-cyan-500/20',
  },
  {
    appId: 'ai',
    title: 'AI Copilot Dock',
    icon: <Sparkles className="w-5 h-5 text-purple-400" />,
    color: 'hover:bg-purple-500/20',
  },
  {
    appId: 'settings',
    title: 'Cài đặt Web OS',
    icon: <Sliders className="w-5 h-5 text-stone-400" />,
    color: 'hover:bg-stone-500/20',
  },
];

export function DesktopDock() {
  const { windows, activeWindowId, openWindow, minimizeAll } = useWindowManager();

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none">
      <div className="backdrop-blur-2xl bg-stone-900/85 border border-stone-700/60 shadow-2xl shadow-black/80 rounded-2xl px-3 py-2 flex items-center gap-1.5 transition-all">
        {DOCK_APPS.map((app) => {
          const openWin = windows.find((w) => w.appId === app.appId);
          const isOpen = Boolean(openWin);
          const isFocused = openWin && activeWindowId === openWin.id && !openWin.isMinimized;

          return (
            <button
              key={app.appId}
              onClick={() => openWindow(app.appId, app.title)}
              title={app.title}
              className={`relative group p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 flex flex-col items-center ${app.color} ${
                isFocused ? 'bg-stone-800 ring-1 ring-emerald-500/50' : 'bg-stone-800/40 hover:bg-stone-800/70'
              }`}
            >
              {app.icon}

              {/* Tooltip on hover */}
              <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform origin-bottom px-2 py-1 rounded bg-stone-900/95 text-stone-200 text-[11px] font-medium border border-stone-700 shadow-xl whitespace-nowrap pointer-events-none">
                {app.title}
              </span>

              {/* Dot indicator if app is open */}
              {isOpen && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isFocused ? 'bg-emerald-400 w-2.5' : 'bg-stone-400'
                  } transition-all`}
                />
              )}
            </button>
          );
        })}

        {/* Separator */}
        <div className="w-[1px] h-7 bg-stone-700/60 mx-1" />

        {/* Show Desktop / Minimize All Button */}
        <button
          onClick={minimizeAll}
          title="Thu nhỏ toàn bộ / Hiện màn hình nền"
          className="p-2.5 rounded-xl bg-stone-800/40 hover:bg-stone-800/80 hover:scale-110 active:scale-95 transition-all text-stone-400 hover:text-stone-200"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
