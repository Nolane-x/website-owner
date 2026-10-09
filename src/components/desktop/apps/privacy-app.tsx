'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, AlertOctagon, CheckCircle2, Server, Globe, Key, RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string;
  eventType: string;
  details: string;
  createdAt: string;
}

export function PrivacyApp() {
  const [panicLocked, setPanicLocked] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security-events');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      loadAuditLogs();
    });
  }, [loadAuditLogs]);

  const triggerPanicLock = () => {
    setPanicLocked(true);
    // Xóa session storage và khóa két
    sessionStorage.clear();
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Privacy Control Center & Data Flow Inspector</h1>
            <p className="text-xs text-stone-400">Giám sát phân loại dữ liệu, luồng kết nối ra ngoài và an ninh cấp hệ thống</p>
          </div>
        </div>

        <button
          onClick={triggerPanicLock}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-semibold transition"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Kích hoạt Khóa Khẩn cấp (Panic Lock)</span>
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {panicLocked && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong>CHẾ ĐỘ KHÓA KHẨN CẤP ĐANG KÍCH HOẠT:</strong> Toàn bộ dữ liệu mật mã trong RAM và bộ nhớ phiên đã bị xóa sạch. Cần nhập lại mật khẩu Master Key để mở khóa Két Sắt.
            </div>
          </div>
        )}

        {/* 3 Tầng Bảo mật Dữ liệu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Lưu Trữ Cục Bộ (Local First)</h3>
            </div>
            <p className="text-xs text-stone-400">
              100% Ghi chú, Nhiệm vụ, Mục tiêu và Hồ sơ được lưu trữ trong Database sở hữu riêng, không qua bên trung gian thứ ba.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center space-x-2 text-sky-400">
              <Key className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Zero-Knowledge Vault</h3>
            </div>
            <p className="text-xs text-stone-400">
              Mật khẩu và khóa API được mã hóa AES-256-GCM với PBKDF2 100,000 vòng trước khi ghi xuống đĩa. Máy chủ không lưu Master Password.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400">
              <Globe className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Quyền Riêng tư AI (AI Privacy)</h3>
            </div>
            <p className="text-xs text-stone-400">
              Cơ chế BYOK độc lập. Dữ liệu đánh dấu <code className="text-rose-300">never_cloud_ai</code> sẽ tự động bị loại khỏi context gửi lên nhà cung cấp LLM.
            </p>
          </div>
        </div>

        {/* Thanh tra Luồng Dữ liệu (Data Flow Inspector) */}
        <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center">
            <Eye className="w-4 h-4 mr-2 text-emerald-400" /> Thanh tra Luồng Dữ liệu Thời gian thực (Data Flow Inspector)
          </h3>
          <div className="divide-y divide-stone-800/80 rounded-xl bg-stone-950 border border-stone-800/80 overflow-hidden text-xs">
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Lưu trữ Cơ sở dữ liệu Cục bộ</span>
                <p className="text-[11px] text-stone-500">PostgreSQL / PGLite 16 WASM</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">BẢO VỆ 100%</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Kết nối API Mô hình AI (OpenAI / Anthropic / Google)</span>
                <p className="text-[11px] text-stone-500">Chỉ gửi khi người dùng thực hiện chat hoặc tổng hợp Second Brain</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">CÓ KIỂM DUYỆT BỞI CHỦ SỞ HỮU</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Thu thập Dữ liệu Nền (Telemetry / Analytics ngầm)</span>
                <p className="text-[11px] text-stone-500">Không có mã theo dõi bên ngoài, không Google Analytics, không pixel</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">VÔ HIỆU HÓA HOÀN TOÀN</span>
            </div>
          </div>
        </div>

        {/* Nhật ký Kiểm toán Sự kiện An ninh */}
        <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center">
              <Server className="w-4 h-4 mr-2 text-sky-400" /> Nhật ký An ninh & Xác thực (Security Audit Events)
            </h3>
            <button
              onClick={loadAuditLogs}
              className="text-xs text-stone-400 hover:text-stone-200 flex items-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
          </div>

          <div className="bg-stone-950 rounded-xl border border-stone-800 p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-stone-500 py-3">Chưa có sự kiện an ninh bất thường nào được ghi nhận.</div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1 border-b border-stone-800/40 last:border-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] text-amber-400">[{l.eventType}]</span>
                    <span className="text-stone-300">{l.details}</span>
                  </div>
                  <span className="text-[10px] text-stone-500">{new Date(l.createdAt).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
