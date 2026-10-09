'use client';

import React, { useState } from 'react';
import { useWindowManager } from '@/lib/desktop/window-manager-context';
import {
  Sliders,
  Download,
  Database,
  Shield,
  Monitor,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export function SettingsApp() {
  const { desktopMode, setDesktopMode } = useWindowManager();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      setExportSuccess(false);

      // Fetch key collections for full offline backup
      const [tasksRes, inboxRes, wallpapersRes, researchRes, decisionsRes] = await Promise.all([
        fetch('/api/admin/tasks'),
        fetch('/api/admin/inbox'),
        fetch('/api/admin/wallpapers'),
        fetch('/api/admin/research'),
        fetch('/api/admin/decisions'),
      ]);

      const [tasks, inbox, wallpapers, research, decisions] = await Promise.all([
        tasksRes.ok ? tasksRes.json() : { tasks: [] },
        inboxRes.ok ? inboxRes.json() : { items: [] },
        wallpapersRes.ok ? wallpapersRes.json() : { wallpapers: [] },
        researchRes.ok ? researchRes.json() : { sources: [] },
        decisionsRes.ok ? decisionsRes.json() : { records: [] },
      ]);

      const backupData = {
        version: '5.0.0',
        exportedAt: new Date().toISOString(),
        system: 'Personal Web OS 5.0 — Sovereign Digital Workspace',
        data: {
          tasks: tasks.tasks,
          inbox: inbox.items,
          wallpapers: wallpapers.wallpapers,
          research: research.sources,
          decisions: decisions.records,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webos-5.0-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (e) {
      console.error('Lỗi sao lưu:', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs p-5 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-800 pb-3">
        <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-emerald-400">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">Cài đặt hệ điều hành Web OS 5.0</h3>
          <p className="text-stone-400 text-[11px]">
            Cấu hình giao diện, quản lý cơ sở dữ liệu PGlite WASM và sao lưu toàn vẹn.
          </p>
        </div>
      </div>

      {/* Mode preferences */}
      <div className="space-y-3">
        <h4 className="font-semibold text-stone-300 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-sky-400" />
          <span>Giao diện & Chế độ làm việc</span>
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDesktopMode('desktop')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
              desktopMode === 'desktop'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <span className="font-bold text-xs text-white">Bàn làm việc Ảo (Desktop Mode)</span>
            <span className="text-[11px] leading-relaxed">
              Các cửa sổ nổi, đa nhiệm kéo thả, dock ứng dụng, widget và shader động.
            </span>
          </button>

          <button
            onClick={() => setDesktopMode('workspace')}
            className={`p-3.5 rounded-xl border text-left transition flex flex-col gap-1 ${
              desktopMode === 'workspace'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-stone-900/50 border-stone-800 text-stone-400 hover:border-stone-700'
            }`}
          >
            <span className="font-bold text-xs text-white">Không gian Lưới (Workspace Mode)</span>
            <span className="text-[11px] leading-relaxed">
              Thanh điều hướng cố định chuẩn trang quản trị, tập trung vào một nhiệm vụ duy nhất.
            </span>
          </button>
        </div>
      </div>

      {/* Database Telemetry */}
      <div className="space-y-3">
        <h4 className="font-semibold text-stone-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span>Cơ sở dữ liệu Cục bộ (Local Sovereignty)</span>
        </h4>

        <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-stone-400">Động cơ lưu trữ:</span>
            <span className="font-mono text-emerald-400 font-semibold">PGlite (PostgreSQL 16 WASM)</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-stone-400">Trạng thái đồng bộ:</span>
            <span className="font-mono text-stone-200">Local-First IndexedDB Persistence</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-stone-400">Bảo mật mạng:</span>
            <span className="font-mono text-emerald-400">Fail-Closed Origin & CSRF Guard</span>
          </div>
        </div>
      </div>

      {/* Data Portability & Export */}
      <div className="space-y-3">
        <h4 className="font-semibold text-stone-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Xuất dữ liệu & Sao lưu Toàn vẹn (Data Portability)</span>
        </h4>

        <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-stone-200">Xuất toàn bộ cơ sở dữ liệu dạng JSON</p>
            <p className="text-stone-400 text-[11px] mt-0.5">
              Bao gồm Inbox, Thẻ Kanban, Nghiên cứu, Hồ sơ quyết định và Cấu hình hình nền.
            </p>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-50 shrink-0"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : exportSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{exportSuccess ? 'Đã xuất tệp!' : 'Tải tệp Sao lưu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
