'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  BookOpen,
  Share2,
  Code2,
  Globe,
  CreditCard,
  Timer,
  Wrench,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { playSound } from '@/lib/audio/sound-fx';

export function FloatingDock({
  onOpenFocusStudio,
  onOpenDevTools,
  onOpenWallpaper,
  onTriggerPanicLock,
}: {
  onOpenFocusStudio: () => void;
  onOpenDevTools: () => void;
  onOpenWallpaper: () => void;
  onTriggerPanicLock: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const DOCK_ITEMS: {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href?: string;
    onClick?: () => void;
    color: string;
  }[] = [
    { id: 'dash', label: 'Bảng điều khiển', icon: LayoutDashboard, href: '/admin', color: 'text-zinc-300' },
    { id: 'tasks', label: 'Kanban Tasks', icon: CheckSquare, href: '/admin/tasks', color: 'text-blue-400' },
    { id: 'notes', label: 'Ghi chú & Bài viết', icon: FileText, href: '/admin/content', color: 'text-amber-400' },
    { id: 'journal', label: 'Nhật ký 365 Ngày', icon: BookOpen, href: '/admin/journal', color: 'text-rose-400' },
    { id: 'graph', label: 'Đồ thị Tri thức', icon: Share2, href: '/admin/graph', color: 'text-violet-400' },
    { id: 'snippets', label: 'Kho Đoạn mã', icon: Code2, href: '/admin/snippets', color: 'text-cyan-400' },
    { id: 'api', label: 'Thử nghiệm API', icon: Globe, href: '/admin/api-tester', color: 'text-amber-300' },
    { id: 'subs', label: 'Chi phí & Dịch vụ', icon: CreditCard, href: '/admin/subscriptions', color: 'text-emerald-400' },
    { id: 'focus', label: 'Focus Studio', icon: Timer, onClick: onOpenFocusStudio, color: 'text-orange-400' },
    { id: 'devtools', label: 'Dev Utilities', icon: Wrench, onClick: onOpenDevTools, color: 'text-indigo-400' },
    { id: 'wallpaper', label: 'Hình nền Web OS', icon: Sparkles, onClick: onOpenWallpaper, color: 'text-pink-400' },
    { id: 'lock', label: 'Panic Lock', icon: Lock, onClick: onTriggerPanicLock, color: 'text-red-400' },
  ];

  if (collapsed) {
    return (
      <div className="fixed bottom-2 right-4 z-40 animate-in fade-in">
        <button
          onClick={() => {
            playSound('pop');
            setCollapsed(false);
          }}
          className="p-2 rounded-full bg-[var(--bg-surface)]/90 backdrop-blur-lg border border-[var(--border-color)] shadow-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:scale-110 transition-all"
          title="Hiện thanh Dock"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 inset-x-0 mx-auto w-fit z-40 pointer-events-auto px-2">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[var(--bg-surface)]/85 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 ring-1 ring-black/20">
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;

          const content = (
            <button
              onClick={() => {
                playSound('pop');
                if (item.onClick) item.onClick();
              }}
              className={`relative p-2 rounded-xl transition-all duration-200 group flex items-center justify-center hover:scale-125 hover:-translate-y-1.5 ${
                isActive
                  ? 'bg-white/15 shadow-inner'
                  : 'hover:bg-white/10'
              }`}
              title={item.label}
            >
              <Icon size={18} className={item.color} />

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}

              {/* Tooltip on hover */}
              <span className="absolute -top-8 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/90 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                {item.label}
              </span>
            </button>
          );

          return item.href ? (
            <Link key={item.id} href={item.href}>
              {content}
            </Link>
          ) : (
            <React.Fragment key={item.id}>{content}</React.Fragment>
          );
        })}

        {/* Collapse button */}
        <button
          onClick={() => {
            playSound('thock');
            setCollapsed(true);
          }}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors ml-1"
          title="Thu nhỏ Dock"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
