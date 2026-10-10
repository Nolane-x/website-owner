'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Database, Download, ShieldCheck, HardDrive, FileCode, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

interface TableStat {
  name: string;
  label: string;
  count: number;
  description: string;
  route: string;
}

function getArray(payload: unknown, candidates: string[]): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const candidate of candidates) {
    if (Array.isArray(record[candidate])) return record[candidate] as unknown[];
  }
  return [];
}

export function FilesApp() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'files' | 'database' | 'backup'>('database');
  const [tables, setTables] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [checksum, setChecksum] = useState<string | null>(null);
  const [inspectedAt, setInspectedAt] = useState<string | null>(null);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [backupState, setBackupState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const inspectDatabase = useCallback(async () => {
    setLoading(true);
    setInspectionError(null);
    try {
      const endpoints = [
        { url: '/api/admin/content', name: 'content_items', label: 'Nội dung & bài viết', description: 'Bản ghi CMS riêng của chủ sở hữu', route: '/admin/content', candidates: ['items', 'contentItems'] },
        { url: '/api/admin/tasks', name: 'kanban_tasks', label: 'Nhiệm vụ Kanban', description: 'Nhiệm vụ đang được lưu trong database', route: '/admin/tasks', candidates: ['tasks'] },
        { url: '/api/admin/inbox', name: 'inbox_items', label: 'Universal Inbox', description: 'Ý tưởng và liên kết đang chờ xử lý', route: '/admin/inbox', candidates: ['items'] },
        { url: '/api/admin/snippets', name: 'code_snippets', label: 'Code Snippets', description: 'Đoạn mã đã lưu', route: '/admin/snippets', candidates: ['snippets', 'items'] },
        { url: '/api/admin/wallpapers', name: 'custom_wallpapers', label: 'Hình nền tùy chỉnh', description: 'Metadata hình nền; không phải tổng dung lượng file trên thiết bị', route: '/admin/settings', candidates: ['wallpapers', 'items'] },
        { url: '/api/admin/research', name: 'research_sources', label: 'Nguồn nghiên cứu', description: 'Nguồn tham khảo đã lưu', route: '/admin/research', candidates: ['sources'] },
        { url: '/api/admin/vault', name: 'vault_items', label: 'Két sắt mã hóa', description: 'Các mục vault được API trả về; không hiển thị nội dung bí mật', route: '/admin/vault', candidates: ['items', 'vaultItems'] },
        { url: '/api/admin/scratchpads', name: 'scratchpads', label: 'Ghi chú nhanh', description: 'Sticky notes / scratchpad đã lưu', route: '/admin/content', candidates: ['scratchpads', 'notes', 'items'] },
      ] as const;

      const payloads = await Promise.all(endpoints.map(async (endpoint) => {
        const response = await fetch(endpoint.url, { cache: 'no-store' });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const error = payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : `HTTP ${response.status}`;
          throw new Error(`${endpoint.label}: ${error}`);
        }
        return getArray(payload, [...endpoint.candidates]);
      }));

      const nextTables = endpoints.map((endpoint, index) => ({
        name: endpoint.name,
        label: endpoint.label,
        count: payloads[index].length,
        description: endpoint.description,
        route: endpoint.route,
      }));
      setTables(nextTables);

      // This is a SHA-256 digest of the visible API record counts, not a database/backup integrity proof.
      const summaryPayload = JSON.stringify(nextTables.map(({ name, count }) => ({ name, count })));
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(summaryPayload));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      setChecksum(hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join(''));
      setInspectedAt(new Date().toISOString());
    } catch (caught) {
      setInspectionError(caught instanceof Error ? caught.message : 'Không thể kiểm tra dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void inspectDatabase(); });
  }, [inspectDatabase]);

  const handleExportBackup = async () => {
    setBackupState('working');
    setBackupMessage(null);
    try {
      const response = await fetch('/api/admin/export', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || `Xuất dữ liệu thất bại (HTTP ${response.status}).`);
      }
      const text = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { throw new Error('Server không trả về JSON backup hợp lệ.'); }
      if (!payload || typeof payload !== 'object' || !('version' in payload) || !('data' in payload)) {
        throw new Error('Tệp export thiếu version hoặc data; không bắt đầu download.');
      }
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      if (blob.size === 0) throw new Error('Tệp backup trống.');
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `webos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
      setBackupState('done');
      const sizeKb = (blob.size / 1024).toFixed(1);
      const importLimitNote = blob.size > 4.5 * 1024 * 1024
        ? ' CẢNH BÁO: tệp vượt giới hạn import 4.5 MB của API hiện tại, nên chưa thể khôi phục qua màn import tích hợp.'
        : '';
      setBackupMessage(`Đã tạo và tải JSON backup ${sizeKb} KB, version ${String((payload as { version: unknown }).version)}. Bản export hiện chưa có manifest/checksum độc lập; hãy giữ nhiều bản sao ở nơi an toàn.${importLimitNote}`);
    } catch (caught) {
      setBackupState('error');
      setBackupMessage(caught instanceof Error ? caught.message : 'Không thể tạo backup.');
    }
  };

  const folderItems = tables;

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl"><HardDrive className="w-5 h-5" /></div>
          <div className="min-w-0"><h1 className="text-base font-bold text-white">Virtual Explorer & Data Studio</h1><p className="text-xs text-stone-400">Các shortcut tới module, số lượng lấy từ API thật và công cụ export</p></div>
        </div>
        <button onClick={() => void inspectDatabase()} disabled={loading} className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 disabled:opacity-50" title="Làm mới dữ liệu"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex items-center px-3 md:px-5 border-b border-stone-800 bg-stone-900/30 text-xs overflow-x-auto">
        {[
          { id: 'database' as const, label: 'Bảng dữ liệu', icon: Database },
          { id: 'files' as const, label: 'Shortcut module', icon: Folder },
          { id: 'backup' as const, label: 'Backup Center', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium transition whitespace-nowrap ${activeTab === tab.id ? 'border-sky-500 text-sky-400 bg-sky-500/5' : 'border-transparent text-stone-400 hover:text-stone-200'}`}><Icon className="w-4 h-4" />{tab.label}</button>;
        })}
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
        {inspectionError && <div role="alert" className="p-3 rounded-xl border border-rose-800 bg-rose-950/30 text-rose-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />Không hoàn tất được lượt kiểm tra: {inspectionError}. Các số liệu trước đó không được coi là mới nhất.</div>}

        {activeTab === 'database' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800"><span className="text-xs text-stone-400">Cấu hình database trong code</span><div className="text-base font-bold text-emerald-300 mt-2">PostgreSQL / PGlite</div><p className="text-[11px] text-stone-500 mt-1">Production bắt buộc DATABASE_URL; PGlite cho development/test. Panel này không truy vấn trực tiếp phiên bản engine đang chạy.</p></div>
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800"><span className="text-xs text-stone-400">Phạm vi lượt kiểm tra</span><div className="text-base font-bold text-sky-300 mt-2">{tables.length} endpoint API</div><p className="text-[11px] text-stone-500 mt-1">Đếm bản ghi API trả về; không phải quét khóa ngoại, orphan records hoặc kiểm định đầy đủ schema.</p><p className="text-[10px] text-stone-600 mt-2">{inspectedAt ? `Lần kiểm tra: ${new Date(inspectedAt).toLocaleString('vi-VN')}` : 'Chưa có lượt kiểm tra thành công'}</p></div>
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800"><span className="text-xs text-stone-400">SHA-256 của bảng đếm API</span><div className="text-[10px] font-mono text-stone-300 break-all mt-2 bg-stone-950 p-2 rounded border border-stone-800">{checksum || (loading ? 'Đang tính...' : 'Chưa có dữ liệu')}</div><p className="text-[10px] text-amber-200 mt-2">Không phải checksum của toàn bộ database hay backup file.</p></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Thống kê trả về từ API</h3>
              <div className="rounded-2xl border border-stone-800 bg-stone-900 overflow-hidden divide-y divide-stone-800/60">
                {tables.map((table) => <div key={table.name} className="flex items-center justify-between gap-3 p-4"><div className="flex items-center gap-3 min-w-0"><div className="p-2 rounded-xl bg-stone-800 text-stone-300"><FileCode className="w-4 h-4 text-sky-400" /></div><div className="min-w-0"><div className="text-sm font-semibold text-white">{table.label} <span className="text-xs text-stone-500 font-mono">({table.name})</span></div><p className="text-xs text-stone-400">{table.description}</p></div></div><span className="text-sm font-bold text-sky-300 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 font-mono shrink-0">{table.count} bản ghi</span></div>)}
                {!tables.length && !loading && !inspectionError && <div className="p-6 text-center text-xs text-stone-500">Chưa có kết quả thống kê.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-400">Đây là các shortcut điều hướng tới module trong Personal Web OS, không phải cây thư mục của ổ đĩa máy tính. Số lượng bên dưới là bản ghi API đã được kiểm tra.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {folderItems.map((item) => <button key={item.name} onClick={() => router.push(item.route)} className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-3 text-left hover:border-sky-700 hover:bg-stone-900/80 transition"><div className="flex items-center gap-3 min-w-0"><div className="p-3 bg-sky-500/20 text-sky-400 rounded-2xl"><Folder className="w-5 h-5" /></div><div className="min-w-0"><h4 className="text-sm font-bold text-white">{item.label}</h4><span className="text-xs text-stone-500 font-mono">{item.route}</span><p className="text-[10px] text-stone-500 mt-1">{item.description}</p></div></div><div className="text-right shrink-0"><div className="text-xs font-bold text-stone-300">{item.count} mục</div><ExternalLink className="w-3.5 h-3.5 text-stone-600 ml-auto mt-1" /></div></button>)}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="max-w-2xl mx-auto space-y-5 p-6 rounded-3xl bg-stone-900 border border-stone-800">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><ShieldCheck className="w-7 h-7" /></div>
            <div className="text-center"><h3 className="text-lg font-bold text-white">JSON Backup / Export</h3><p className="text-xs text-stone-400 mt-2 max-w-xl mx-auto">Tạo tệp từ endpoint export, kiểm tra JSON và version trước khi tải. Tệp export hiện chưa có checksum độc lập hoặc báo cáo import preview; đây không thay thế backup ngoài ứng dụng.</p></div>
            <div className="flex justify-center"><button onClick={() => void handleExportBackup()} disabled={backupState === 'working'} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"><Download className="w-4 h-4" />{backupState === 'working' ? 'Đang xác minh & tải...' : 'Xuất bản sao lưu JSON'}</button></div>
            {backupMessage && <div role={backupState === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs ${backupState === 'error' ? 'border-rose-800 bg-rose-950/20 text-rose-200' : 'border-emerald-800 bg-emerald-950/20 text-emerald-200'}`}>{backupState === 'done' && <CheckCircle2 className="w-4 h-4 inline mr-1.5" />}{backupMessage}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
