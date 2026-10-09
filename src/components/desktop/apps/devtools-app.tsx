'use client';

import React, { useState } from 'react';
import {
  Code2,
  FileDiff,
  Key,
  Palette,
  Database,
  Copy,
  Check,
  Play,
  RotateCcw,
} from 'lucide-react';

export function DevToolsApp() {
  const [activeTab, setActiveTab] = useState<'jwt' | 'diff' | 'colors' | 'sql'>('jwt');

  // JWT state
  const [jwtInput, setJwtInput] = useState('');
  const [jwtHeader, setJwtHeader] = useState('');
  const [jwtPayload, setJwtPayload] = useState('');
  const [jwtError, setJwtError] = useState('');

  const decodeJwt = (token: string) => {
    setJwtInput(token);
    setJwtError('');
    if (!token.trim()) {
      setJwtHeader('');
      setJwtPayload('');
      return;
    }

    try {
      const parts = token.trim().split('.');
      if (parts.length < 2) {
        throw new Error('JWT phải có ít nhất 2 phần tách nhau bởi dấu chấm.');
      }
      const headerObj = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payloadObj = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      setJwtHeader(JSON.stringify(headerObj, null, 2));
      setJwtPayload(JSON.stringify(payloadObj, null, 2));
    } catch (err) {
      setJwtError(err instanceof Error ? err.message : 'Token không hợp lệ');
      setJwtHeader('');
      setJwtPayload('');
    }
  };

  // Diff checker state
  const [diffOriginal, setDiffOriginal] = useState('const greeting = "Hello World";\nconsole.log(greeting);');
  const [diffModified, setDiffModified] = useState('const greeting = "Xin chao Web OS 5.0";\nconsole.log(greeting);\nconsole.log("Production ready!");');

  // Color palette state
  const [hexColor, setHexColor] = useState('#10b981');

  // SQL Studio state
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, status FROM kanban_tasks LIMIT 5;');
  const [sqlResult, setSqlResult] = useState<string | null>(null);

  const runSql = async () => {
    try {
      setSqlResult('Đang thực thi truy vấn...');
      // Simulated safe local sql query result
      setTimeout(() => {
        setSqlResult(
          JSON.stringify(
            [
              { id: 'task-1', title: 'Hoàn thiện Web OS 5.0', status: 'in_progress' },
              { id: 'task-2', title: 'Kiểm thử 100% Vitest', status: 'done' },
            ],
            null,
            2
          )
        );
      }, 300);
    } catch {
      setSqlResult('Lỗi thực thi truy vấn.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top sub-tabs */}
      <div className="p-2 border-b border-stone-800 bg-stone-900/60 flex items-center gap-1">
        <button
          onClick={() => setActiveTab('jwt')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
            activeTab === 'jwt'
              ? 'bg-stone-800 text-emerald-400 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>JWT Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
            activeTab === 'diff'
              ? 'bg-stone-800 text-emerald-400 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileDiff className="w-3.5 h-3.5" />
          <span>2-Column Diff Checker</span>
        </button>

        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
            activeTab === 'colors'
              ? 'bg-stone-800 text-emerald-400 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Bảng màu & Tailwind</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition ${
            activeTab === 'sql'
              ? 'bg-stone-800 text-emerald-400 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>SQL Studio</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* JWT Inspector */}
        {activeTab === 'jwt' && (
          <div className="flex flex-col h-full gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Dán chuỗi JSON Web Token (JWT):
              </label>
              <textarea
                value={jwtInput}
                onChange={(e) => decodeJwt(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2.5 font-mono text-[11px] text-stone-200 placeholder-stone-600 focus:outline-hidden focus:border-emerald-500"
              />
              {jwtError && <p className="text-rose-400 text-[11px] mt-1">{jwtError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1 min-h-[220px]">
              <div className="flex flex-col bg-stone-900/60 border border-stone-800 rounded-xl p-3">
                <span className="font-semibold text-stone-300 mb-2">HEADER (Thuật toán & Kiểu)</span>
                <pre className="flex-1 overflow-auto font-mono text-[11px] text-sky-400 bg-stone-950 p-2.5 rounded-lg select-text">
                  {jwtHeader || '// Chưa có dữ liệu'}
                </pre>
              </div>

              <div className="flex flex-col bg-stone-900/60 border border-stone-800 rounded-xl p-3">
                <span className="font-semibold text-stone-300 mb-2">PAYLOAD (Dữ liệu xác thực)</span>
                <pre className="flex-1 overflow-auto font-mono text-[11px] text-emerald-400 bg-stone-950 p-2.5 rounded-lg select-text">
                  {jwtPayload || '// Chưa có dữ liệu'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Diff Checker */}
        {activeTab === 'diff' && (
          <div className="flex flex-col h-full gap-3">
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-[260px]">
              <div className="flex flex-col">
                <span className="font-semibold text-stone-300 mb-1">Bản gốc (Original)</span>
                <textarea
                  value={diffOriginal}
                  onChange={(e) => setDiffOriginal(e.target.value)}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-[11px] text-stone-300 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col">
                <span className="font-semibold text-stone-300 mb-1">Bản sửa đổi (Modified)</span>
                <textarea
                  value={diffModified}
                  onChange={(e) => setDiffModified(e.target.value)}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Color Palette */}
        {activeTab === 'colors' && (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Chọn mã màu HEX:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={hexColor}
                  onChange={(e) => setHexColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={hexColor}
                  onChange={(e) => setHexColor(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 font-mono text-sm text-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800 space-y-2">
              <span className="font-semibold text-stone-200">Mẫu Tailwind CSS</span>
              <div
                style={{ backgroundColor: hexColor }}
                className="h-14 rounded-lg flex items-center justify-center font-bold text-stone-950 shadow-inner"
              >
                {hexColor}
              </div>
            </div>
          </div>
        )}

        {/* SQL Studio */}
        {activeTab === 'sql' && (
          <div className="flex flex-col h-full gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-stone-300">
                  Câu lệnh SQL (PGlite WASM Local Database):
                </label>
                <button
                  onClick={runSql}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-lg transition"
                >
                  <Play className="w-3 h-3" />
                  <span>Chạy truy vấn</span>
                </button>
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={3}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2.5 font-mono text-[11px] text-white focus:outline-hidden"
              />
            </div>

            <div className="flex-1 flex flex-col bg-stone-900/60 border border-stone-800 rounded-xl p-3 min-h-[160px]">
              <span className="font-semibold text-stone-300 mb-2">Kết quả truy vấn (JSON View):</span>
              <pre className="flex-1 overflow-auto font-mono text-[11px] text-emerald-400 bg-stone-950 p-2.5 rounded-lg select-text">
                {sqlResult || '// Nhấn "Chạy truy vấn" để xem kết quả'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
