'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Database, Download, ShieldCheck, HardDrive, FileCode, RefreshCw, AlertTriangle, CheckCircle2, ExternalLink, Upload, FileCheck2 } from 'lucide-react';
import { canonicalJson } from '@/lib/backup/json';

const MAX_IMPORT_BYTES = 4.5 * 1024 * 1024;

interface BackupPreview {
  version: string;
  integrity: 'verified' | 'legacy-unverified';
  digest: string | null;
  totalRecords: number;
  recordCounts: Record<string, number>;
  warnings: string[];
}
type BackupPayload = Record<string, unknown>;

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
  const [importState, setImportState] = useState<'idle' | 'previewing' | 'ready' | 'importing' | 'done' | 'error'>('idle');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<BackupPayload | null>(null);
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);

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
      if (!payload || typeof payload !== 'object' || !('version' in payload) || !('data' in payload) || !('integrity' in payload)) {
        throw new Error('Tệp export thiếu version, data hoặc manifest integrity; không bắt đầu download.');
      }
      const backup = payload as { version: unknown; data: unknown; integrity: unknown };
      if (!backup.integrity || typeof backup.integrity !== 'object' || !('digest' in backup.integrity) || typeof (backup.integrity as { digest?: unknown }).digest !== 'string') {
        throw new Error('Manifest SHA-256 trong backup không hợp lệ.');
      }
      const integrity = backup.integrity as { algorithm?: unknown; scope?: unknown; digest: string };
      if (integrity.algorithm !== 'SHA-256' || integrity.scope !== 'data' || !/^[a-f0-9]{64}$/i.test(integrity.digest)) {
        throw new Error('Thuật toán hoặc định dạng checksum của backup không được hỗ trợ.');
      }
      const digestBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(backup.data)));
      const calculatedDigest = Array.from(new Uint8Array(digestBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
      if (calculatedDigest !== integrity.digest.toLowerCase()) throw new Error('Checksum SHA-256 không khớp với dữ liệu backup. Đã hủy download.');
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
      setBackupMessage(`Đã xác minh SHA-256 và tải backup ${sizeKb} KB, version ${String(backup.version)}. Digest: ${integrity.digest}.${importLimitNote} Hãy giữ một bản sao ở nơi khác; checksum giúp phát hiện thay đổi nhưng không phải chữ ký chống giả mạo.`);
    } catch (caught) {
      setBackupState('error');
      setBackupMessage(caught instanceof Error ? caught.message : 'Không thể tạo backup.');
    }
  };

  const handlePreviewImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setImportState('previewing');
    setImportFileName(file.name);
    setImportPayload(null);
    setImportPreview(null);
    setImportMessage(null);
    setConfirmImport(false);

    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error('Tệp vượt giới hạn 4.5 MB hiện tại. Hãy chia nhỏ dữ liệu hoặc dùng bản backup gọn hơn.');
      }
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON backup phải là một object ở cấp cao nhất.');
      }
      const candidate = parsed as BackupPayload;
      if ('version' in candidate && typeof candidate.version === 'string' && !candidate.version.startsWith('5.')) {
        throw new Error(`Phiên bản backup (${candidate.version}) không tương thích với Web OS 5.0.`);
      }
      if (!candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) {
        throw new Error('Backup không có trường data hợp lệ.');
      }

      const requestBody = JSON.stringify({ ...candidate, mode: 'preview' });
      if (new TextEncoder().encode(requestBody).byteLength > MAX_IMPORT_BYTES) {
        throw new Error('Payload sau khi kiểm tra vượt giới hạn 4.5 MB của API import.');
      }
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: requestBody,
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof (result as { error?: unknown }).error === 'string'
          ? (result as { error: string }).error
          : `Không thể xác thực backup (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (!result || typeof result !== 'object' || !('success' in result) || (result as { success?: unknown }).success !== true) {
        throw new Error('Server không trả về báo cáo preview hợp lệ.');
      }
      const preview = result as BackupPreview & { success: boolean };
      if (typeof preview.totalRecords !== 'number' || !preview.recordCounts || typeof preview.recordCounts !== 'object' ||
          !Array.isArray(preview.warnings) || !['verified', 'legacy-unverified'].includes(preview.integrity)) {
        throw new Error('Báo cáo preview thiếu trường kiểm tra bắt buộc.');
      }
      setImportPayload(candidate);
      setImportPreview(preview);
      setImportState('ready');
      setImportMessage(preview.integrity === 'verified'
        ? 'Checksum được xác minh: chưa phát hiện thay đổi trong dữ liệu kể từ lúc tạo manifest.'
        : 'Backup cũ không có checksum: không thể xác minh tính toàn vẹn hồi tố. Chỉ tiếp tục nếu bạn tin nguồn tệp.');
    } catch (caught) {
      setImportState('error');
      setImportMessage(caught instanceof Error ? caught.message : 'Không thể đọc hoặc xác minh backup.');
    }
  };

  const handleRestoreImport = async () => {
    if (!importPayload || !importPreview || !confirmImport || importState !== 'ready') return;
    setImportState('importing');
    setImportMessage(null);
    try {
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ ...importPayload, mode: 'restore' }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === 'object' && 'error' in result && typeof (result as { error?: unknown }).error === 'string'
          ? (result as { error: string }).error
          : `Khôi phục thất bại (HTTP ${response.status}).`;
        throw new Error(message);
      }
      const message = result && typeof result === 'object' && 'message' in result && typeof (result as { message?: unknown }).message === 'string'
        ? (result as { message: string }).message
        : 'Đã hoàn tất yêu cầu khôi phục.';
      setImportState('done');
      setImportMessage(message);
      setImportPayload(null);
      setImportPreview(null);
      setImportFileName(null);
      setConfirmImport(false);
      await inspectDatabase();
    } catch (caught) {
      setImportState('error');
      setImportMessage(caught instanceof Error ? caught.message : 'Không thể khôi phục backup.');
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
          <div className="max-w-3xl mx-auto space-y-5">
            <section className="space-y-5 p-6 rounded-3xl bg-stone-900 border border-stone-800">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><ShieldCheck className="w-7 h-7" /></div>
              <div className="text-center"><h3 className="text-lg font-bold text-white">JSON Backup / Export</h3><p className="text-xs text-stone-400 mt-2 max-w-xl mx-auto">Xuất dữ liệu được lưu bởi ứng dụng thành tệp JSON có manifest thống kê và checksum SHA-256. Checksum giúp phát hiện dữ liệu bị đổi hoặc hỏng; nó không phải chữ ký mật mã chống giả mạo.</p></div>
              <div className="flex justify-center"><button onClick={() => void handleExportBackup()} disabled={backupState === 'working'} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"><Download className="w-4 h-4" />{backupState === 'working' ? 'Đang xác minh & tải...' : 'Xuất bản sao lưu JSON'}</button></div>
              {backupMessage && <div role={backupState === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs ${backupState === 'error' ? 'border-rose-800 bg-rose-950/20 text-rose-200' : 'border-emerald-800 bg-emerald-950/20 text-emerald-200'}`}>{backupState === 'done' && <CheckCircle2 className="w-4 h-4 inline mr-1.5" />}{backupMessage}</div>}
            </section>

            <section className="space-y-4 p-6 rounded-3xl bg-stone-900 border border-stone-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-300"><Upload className="w-5 h-5" /></div>
                <div><h3 className="text-base font-bold text-white">Khôi phục từ bản sao lưu</h3><p className="text-xs text-stone-400 mt-1">Chọn JSON để chạy kiểm tra preview. Bước preview chỉ đọc tệp và xác minh cấu trúc/checksum, không ghi bản ghi vào database.</p></div>
              </div>
              <label htmlFor="webos-backup-file" className="block text-xs font-medium text-stone-300">Tệp backup (.json)</label>
              <input id="webos-backup-file" type="file" accept=".json,application/json" onChange={(event) => void handlePreviewImport(event)} disabled={importState === 'previewing' || importState === 'importing'} className="block w-full text-xs text-stone-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-sky-500 disabled:opacity-50" />
              {importFileName && <p className="text-[11px] text-stone-400">Tệp đã chọn: <span className="font-mono text-stone-300">{importFileName}</span></p>}
              {importState === 'previewing' && <div role="status" className="text-xs text-sky-200">Đang đọc và xác minh backup trên server…</div>}
              {importMessage && <div role={importState === 'error' ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs ${importState === 'error' ? 'border-rose-800 bg-rose-950/20 text-rose-200' : importState === 'done' ? 'border-emerald-800 bg-emerald-950/20 text-emerald-200' : 'border-amber-800 bg-amber-950/20 text-amber-100'}`}>{importState === 'done' && <CheckCircle2 className="w-4 h-4 inline mr-1.5" />}{importMessage}</div>}

              {importPreview && (importState === 'ready' || importState === 'importing') && (
                <div className="space-y-4 rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><div className="text-sm font-bold text-white">Preview dữ liệu</div><div className="text-xs text-stone-400 mt-1">Phiên bản {importPreview.version} · {importPreview.totalRecords.toLocaleString('vi-VN')} bản ghi dự kiến</div></div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${importPreview.integrity === 'verified' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-700/50' : 'bg-amber-500/10 text-amber-200 border border-amber-700/50'}`}><FileCheck2 className="w-3.5 h-3.5" />{importPreview.integrity === 'verified' ? 'SHA-256 đã xác minh' : 'Không có checksum'}</div>
                  </div>
                  {importPreview.digest && <div><div className="text-[10px] uppercase tracking-wider text-stone-500">SHA-256 · phạm vi data</div><div className="break-all rounded-lg border border-stone-800 bg-black/40 p-2 font-mono text-[10px] text-stone-300">{importPreview.digest}</div></div>}
                  <details className="group">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-sky-300">Chi tiết số lượng theo module</summary>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(importPreview.recordCounts).filter(([, count]) => count > 0).map(([name, count]) => <div key={name} className="flex items-center justify-between gap-3 rounded-lg bg-stone-900 px-3 py-2"><span className="break-all text-[11px] text-stone-300">{name}</span><span className="shrink-0 font-mono text-xs text-sky-300">{count}</span></div>)}
                      {importPreview.totalRecords === 0 && <p className="text-xs text-stone-500">Không tìm thấy bản ghi trong các module được hỗ trợ.</p>}
                    </div>
                  </details>
                  {importPreview.warnings.length > 0 && <div className="space-y-2">{importPreview.warnings.map((warning, index) => <div key={index} className="flex gap-2 text-[11px] leading-relaxed text-amber-100"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{warning}</div>)}</div>}
                  <div className="rounded-xl border border-rose-900/70 bg-rose-950/20 p-3 text-xs leading-relaxed text-rose-100">Lưu ý quan trọng: restore là thao tác <strong>thêm</strong> dữ liệu, không thay thế hoặc đồng bộ database hiện tại. Chạy lại cùng một backup có thể tạo bản sao trùng lặp.</div>
                  <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-300">
                    <input type="checkbox" checked={confirmImport} disabled={importState === 'importing'} onChange={(event) => setConfirmImport(event.target.checked)} className="mt-0.5 accent-rose-500" />
                    Tôi đã xem preview và hiểu restore sẽ thêm bản ghi mới; tôi đã giữ bản sao lưu riêng trước khi tiếp tục.
                  </label>
                  <button onClick={() => void handleRestoreImport()} disabled={!confirmImport || importState !== 'ready'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-xs font-bold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"><Upload className="h-4 w-4" />{importState === 'importing' ? 'Đang khôi phục…' : 'Xác nhận và khôi phục dữ liệu'}</button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
