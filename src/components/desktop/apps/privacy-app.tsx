'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, AlertOctagon, Server, Globe, KeyRound, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AuditLog {
  id: string;
  eventType: string;
  detailsJson?: Record<string, unknown> | null;
  createdAt: string;
}

function summarizeDetails(details: Record<string, unknown> | null | undefined): string {
  if (!details || Object.keys(details).length === 0) return 'Không có chi tiết';
  try { return JSON.stringify(details).slice(0, 350); }
  catch { return 'Không thể hiển thị chi tiết'; }
}

export function PrivacyApp() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/admin/security-events?limit=100', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải nhật ký bảo mật.');
      setLogs(Array.isArray(data.events) ? data.events as AuditLog[] : []);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Không thể tải nhật ký bảo mật.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => { void loadAuditLogs(); });
  }, [loadAuditLogs]);

  const triggerPanicLock = () => {
    window.dispatchEvent(new Event('webos:panic-lock'));
    setNotice('Đã gửi yêu cầu khóa không gian toàn màn hình. Thao tác này che UI và yêu cầu xác thực lại; nó không xóa sạch toàn bộ RAM hoặc trạng thái của tiến trình trình duyệt.');
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl"><Shield className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white">Privacy & Security Center</h1>
            <p className="text-xs text-stone-400">Trạng thái thực tế và giới hạn đang biết; không tuyên bố bảo vệ 100% khi chưa kiểm chứng.</p>
          </div>
        </div>
        <button onClick={triggerPanicLock} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 text-rose-200 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-semibold shrink-0">
          <AlertOctagon className="w-3.5 h-3.5" /><span>Khóa không gian</span>
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5">
        {notice && <div role="status" className="p-3 rounded-xl border border-sky-800 bg-sky-950/25 text-sky-200 text-xs">{notice}</div>}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-300"><Server className="w-4 h-4" /><h2 className="text-xs font-bold uppercase tracking-wider">Dữ liệu ứng dụng</h2></div>
            <p className="text-xs leading-relaxed text-stone-300">Ở production, dữ liệu đi qua API server tới database PostgreSQL được cấu hình bằng DATABASE_URL. PGlite nhúng được dùng ở chế độ development/test. Vì vậy không thể tuyên bố toàn bộ Tasks/Notes/Projects hiện là local-first hoặc chỉ lưu trên thiết bị.</p>
            <span className="inline-flex text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-200">Server-backed theo cấu hình hiện tại</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300"><KeyRound className="w-4 h-4" /><h2 className="text-xs font-bold uppercase tracking-wider">Vault encryption</h2></div>
            <p className="text-xs leading-relaxed text-stone-300">Code Vault dùng Web Crypto AES-GCM 256-bit; khóa được dẫn xuất bằng PBKDF2-SHA-256 với 600.000 vòng cho dữ liệu mới và thử 100.000 vòng cho dữ liệu legacy. Điều này bảo vệ ciphertext trong database, nhưng không bảo đảm chống XSS, extension độc hại hoặc máy đã bị chiếm quyền.</p>
            <span className="inline-flex text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-200">Primitive mật mã có trong code</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-300"><Globe className="w-4 h-4" /><h2 className="text-xs font-bold uppercase tracking-wider">AI data flow</h2></div>
            <p className="text-xs leading-relaxed text-stone-300">Copilot hiện gửi câu hỏi tới provider chỉ khi bạn chọn provider và yêu cầu model. Dữ liệu cá nhân chỉ được truy xuất để làm context khi bạn bật tùy chọn đó; API key được giữ trong state của component đang mở, không ghi vào database hay localStorage. Khi gửi, provider bên ngoài vẫn có thể xử lý nội dung theo chính sách của họ.</p>
            <span className="inline-flex text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-200">Context mặc định tắt trong Copilot</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-300"><Eye className="w-4 h-4" /><h2 className="text-xs font-bold uppercase tracking-wider">Telemetry & integrations</h2></div>
            <p className="text-xs leading-relaxed text-stone-300">Màn hình này chưa có network monitor để chứng minh mọi request bên ngoài, và chưa phải một Data Flow Inspector toàn diện. Không thể suy ra “không thu thập telemetry” chỉ vì nhật ký trống. Cần kiểm tra deployment, các request thực tế và cấu hình tích hợp riêng.</p>
            <span className="inline-flex text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-200">Chưa được kiểm toán tự động toàn diện</span>
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center"><Server className="w-4 h-4 mr-2 text-sky-400" />Nhật ký bảo mật (tối đa 100 mục)</h2>
            <button onClick={() => void loadAuditLogs()} disabled={loading} className="text-xs text-stone-400 hover:text-white flex items-center disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>
          </div>
          {loadError && <div role="alert" className="p-3 rounded-lg border border-rose-800 bg-rose-950/30 text-rose-200 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{loadError}</div>}
          <div className="bg-stone-950 rounded-xl border border-stone-800 p-3 max-h-72 overflow-y-auto space-y-2 text-xs">
            {loading ? <div className="p-4 text-center text-stone-500">Đang tải nhật ký...</div> :
              logs.length === 0 ? <div className="p-4 text-center text-stone-500">API trả về 0 sự kiện trong phạm vi hiện tại. Điều này không chứng minh không có hoạt động hoặc rủi ro.</div> :
              logs.map((log) => (
                <div key={log.id} className="py-2 border-b border-stone-800/60 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-amber-300">{log.eventType}</span>
                    <span className="text-[10px] text-stone-500">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400 break-words">{summarizeDetails(log.detailsJson)}</p>
                </div>
              ))
            }
          </div>
        </section>

        <section className="rounded-xl border border-stone-800 bg-stone-900/40 p-4 text-[11px] text-stone-400 space-y-2">
          <div className="font-semibold text-stone-200 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" />Giới hạn quan trọng</div>
          <p>Panic Lock là một lớp che giao diện của ứng dụng và xác thực lại tài khoản; nó không thể xóa toàn bộ bộ nhớ của Chrome, ngăn keylogger, bảo vệ khỏi malware hay thay thế khoá màn hình hệ điều hành.</p>
          <p>Việc bật AI, plugin, browser companion hoặc connector trong tương lai phải có quyền riêng và nguồn dữ liệu rõ ràng. Màn hình này hiển thị các giới hạn đã biết thay vì biến chúng thành huy hiệu “an toàn 100%”.</p>
        </section>
      </div>
    </div>
  );
}
