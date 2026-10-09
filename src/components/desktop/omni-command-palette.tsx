'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Zap, ArrowRight, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';

interface CommandItem {
  id: string;
  category: 'Ứng dụng' | 'Thao tác nhanh' | 'Lệnh hệ thống';
  title: string;
  syntax?: string;
  description: string;
  action: () => void;
}

interface OmniCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OmniCommandPalette({ isOpen, onClose }: OmniCommandPaletteProps) {
  const { openWindow, windows, minimizeWindow, maximizeWindow, setScreensaverOpen } = useWindowManager();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setExecutionMessage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Danh mục lệnh chuẩn theo Đặc tả Section 48
  const baseCommands: CommandItem[] = [
    // Ứng dụng
    { id: 'app-inbox', category: 'Ứng dụng', title: 'Hộp thư Toàn năng (Inbox)', syntax: 'app open inbox', description: 'Thu nhận ý tưởng, liên kết và nhiệm vụ tức thì', action: () => openWindow('inbox') },
    { id: 'app-tasks', category: 'Ứng dụng', title: 'Quản lý Công việc (Tasks & Kanban)', syntax: 'app open tasks', description: 'Bảng Kanban điều hành và bấm giờ Stopwatch', action: () => openWindow('tasks') },
    { id: 'app-projects', category: 'Ứng dụng', title: 'Trung tâm Dự án (Project Cockpit)', syntax: 'app open projects', description: 'Theo dõi mục tiêu, mốc tiến độ và sức khỏe dự án', action: () => openWindow('projects') },
    { id: 'app-wallpapers', category: 'Ứng dụng', title: 'Studio Hình nền (Wallpapers & Shaders)', syntax: 'app open wallpapers', description: 'Ma trận hình nền động, video và shader thời gian thực', action: () => openWindow('wallpapers') },
    { id: 'app-focus', category: 'Ứng dụng', title: 'Phòng Tập trung Sâu (Focus Studio & Pomodoro)', syntax: 'app open focus', description: 'Đồng hồ Pomodoro 2.0 và chế độ thiền Zen', action: () => openWindow('focus') },
    { id: 'app-music', category: 'Ứng dụng', title: 'Phòng Thí nghiệm Âm thanh (Sound Lab)', syntax: 'app open music', description: 'Hòa âm đa kênh và sóng radio Lo-Fi 24/7', action: () => openWindow('music') },
    { id: 'app-notes', category: 'Ứng dụng', title: 'Bộ não Thứ hai (Second Brain & Notes)', syntax: 'app open notes', description: 'Ghi chú kiến thức, liên kết Wiki-links và mạng nơ-ron', action: () => openWindow('notes') },
    { id: 'app-research', category: 'Ứng dụng', title: 'Bàn Nghiên cứu & Phản biện (Research Desk)', syntax: 'app open research', description: 'Kho nguồn tin cậy và bảng đối chiếu luận điểm mâu thuẫn', action: () => openWindow('research') },
    { id: 'app-ai', category: 'Ứng dụng', title: 'Trợ lý AI Độc lập (AI Workbench)', syntax: 'app open ai', description: 'Copilot đa vai trò, RAG cá nhân và kiểm duyệt hành động', action: () => openWindow('ai') },
    { id: 'app-workflows', category: 'Ứng dụng', title: 'Quy trình Tự động hóa (Workflow Canvas)', syntax: 'app open workflows', description: 'Thiết kế luồng tự động hóa dạng node trực quan', action: () => openWindow('workflows') },
    { id: 'app-creator', category: 'Ứng dụng', title: 'Xưởng Sáng tạo Nội dung (Creator Studio)', syntax: 'app open creator', description: 'Quy trình sản xuất nội dung từ ý tưởng đến xuất bản', action: () => openWindow('creator') },
    { id: 'app-learning', category: 'Ứng dụng', title: 'Phòng Học tập (Learning Lab & Spaced Repetition)', syntax: 'app open learning', description: 'Ôn tập thẻ ghi nhớ Anki và trắc nghiệm củng cố', action: () => openWindow('learning') },
    { id: 'app-crm', category: 'Ứng dụng', title: 'Danh bạ Quan hệ (Personal CRM)', syntax: 'app open crm', description: 'Ghi nhớ tương tác, nhắc nhở định kỳ và bảo mật', action: () => openWindow('crm') },
    { id: 'app-devtools', category: 'Ứng dụng', title: 'Phòng Công cụ Kỹ thuật (Dev Power Lab)', syntax: 'app open devtools', description: 'JWT Inspector, Diff Checker, Bảng màu và SQL Studio', action: () => openWindow('devtools') },
    { id: 'app-snippets', category: 'Ứng dụng', title: 'Kho Đoạn mã (Code Snippets)', syntax: 'app open snippets', description: 'Lưu trữ mẫu code đa ngôn ngữ', action: () => openWindow('snippets') },
    { id: 'app-files', category: 'Ứng dụng', title: 'Trình Quản lý Tệp & Dữ liệu (Data Studio)', syntax: 'app open files', description: 'Khám phá tệp ảo, kiểm tra cấu trúc bảng và sao lưu', action: () => openWindow('files') },
    { id: 'app-vault', category: 'Ứng dụng', title: 'Két Sắt Bảo mật (Security Vault 2.0)', syntax: 'app open vault', description: 'Mã hóa AES-256-GCM bảo vệ mật khẩu và ghi chú tối mật', action: () => openWindow('vault') },
    { id: 'app-privacy', category: 'Ứng dụng', title: 'Trung tâm Quyền Riêng tư (Privacy Center)', syntax: 'app open privacy', description: 'Giám sát luồng dữ liệu và thiết lập an toàn', action: () => openWindow('privacy') },
    { id: 'app-calendar', category: 'Ứng dụng', title: 'Lịch & Thói quen (Calendar & Habits)', syntax: 'app open calendar', description: 'Lịch trình cá nhân và theo dõi chuỗi thói quen', action: () => openWindow('calendar') },
    { id: 'app-settings', category: 'Ứng dụng', title: 'Cài đặt Hệ thống (Settings)', syntax: 'app open settings', description: 'Tùy biến giao diện, hình nền và thông số hệ điều hành', action: () => openWindow('settings') },

    // Thao tác nhanh & Lệnh hệ thống
    { id: 'cmd-screensaver', category: 'Lệnh hệ thống', title: 'Bật Màn hình chờ (Screensaver)', syntax: 'wallpaper screensaver', description: 'Kích hoạt ngay màn hình bảo vệ nhàn rỗi', action: () => setScreensaverOpen(true) },
    { id: 'cmd-minimize-all', category: 'Lệnh hệ thống', title: 'Thu nhỏ toàn bộ cửa sổ (Show Desktop)', syntax: 'window minimize-all', description: 'Ẩn toàn bộ ứng dụng xuống thanh dock', action: () => windows.forEach(w => minimizeWindow(w.id)) },
    { id: 'cmd-vault-lock', category: 'Lệnh hệ thống', title: 'Khóa Két Sắt Khẩn cấp (Vault Lock)', syntax: 'vault lock', description: 'Xóa phiên két sắt và bảo vệ dữ liệu', action: () => openWindow('vault') },
    { id: 'cmd-focus-25', category: 'Thao tác nhanh', title: 'Bắt đầu Tập trung Sâu 25 phút', syntax: 'focus start --duration 25', description: 'Mở Focus Studio với chu kỳ Pomodoro 25 phút', action: () => openWindow('focus') },
    { id: 'cmd-quick-capture', category: 'Thao tác nhanh', title: 'Thu nhận Ý tưởng tức thì', syntax: 'capture text', description: 'Mở nhanh Hộp thư Universal Inbox để ghi chép', action: () => openWindow('inbox') },
  ];

  // Lọc lệnh theo truy vấn
  const filteredCommands = baseCommands.filter(cmd => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.syntax?.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const executeSelected = () => {
    // Nếu người dùng nhập lệnh cú pháp trực tiếp (ví dụ: 'app open ...' hoặc 'focus start')
    const raw = query.trim().toLowerCase();
    if (raw.startsWith('app open ')) {
      const appId = raw.replace('app open ', '').trim();
      openWindow(appId);
      onClose();
      return;
    }

    const selected = filteredCommands[selectedIndex];
    if (selected) {
      selected.action();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-stone-900/95 border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thanh nhập liệu Spotlight */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-800 bg-stone-950/60">
          <Search className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm ứng dụng, tài liệu hoặc nhập lệnh hệ thống (ví dụ: app open inbox, focus start)..."
            className="w-full bg-transparent text-stone-100 placeholder-stone-500 text-base focus:outline-none font-medium"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Danh sách kết quả */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-stone-800/40">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
              <p className="text-sm">Không tìm thấy lệnh hoặc ứng dụng phù hợp với &quot;{query}&quot;</p>
              <p className="text-xs text-stone-600 mt-1">Thử gõ: &quot;app open&quot;, &quot;tasks&quot;, &quot;focus&quot;, hoặc &quot;vault&quot;</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white'
                      : 'text-stone-300 hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-800 text-stone-400'
                    }`}>
                      {cmd.category === 'Lệnh hệ thống' ? (
                        <Terminal className="w-4 h-4" />
                      ) : cmd.category === 'Thao tác nhanh' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold truncate">{cmd.title}</span>
                        {cmd.syntax && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800/80 text-stone-400 border border-stone-700/60">
                            {cmd.syntax}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{cmd.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-medium">
                      {cmd.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer trợ giúp phím tắt */}
        <div className="px-4 py-2 bg-stone-950/80 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center space-x-3">
            <span><kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-stone-300">↑</kbd> <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-stone-300">↓</kbd> Di chuyển</span>
            <span><kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-stone-300">Enter</kbd> Thực thi</span>
            <span><kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-stone-300">Esc</kbd> Đóng</span>
          </div>
          <span className="text-stone-500 font-mono">Personal Web OS 5.0 Omni Command</span>
        </div>
      </div>
    </div>
  );
}
