'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Copy,
  Check,
  FileCode,
  Fingerprint,
  Regex,
  KeyRound,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/audio/sound-fx';
import {
  formatJson,
  minifyJson,
  generateUuid,
  testRegex,
  hashString,
  convertTimestamp,
} from '@/lib/dev-tools/converters';

type UtilityTab = 'json' | 'uuid' | 'regex' | 'crypto' | 'timestamp';

export function DevToolsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<UtilityTab>('json');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. JSON State
  const [jsonInput, setJsonInput] = useState('{"title":"WebOS","version":3,"active":true}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 2. UUID State
  const [uuidVersion, setUuidVersion] = useState<'v4' | 'v7'>('v4');
  const [uuidCount, setUuidCount] = useState(5);
  const [generatedUuids, setGeneratedUuids] = useState<string[]>(() => generateUuid('v4', 5));

  // 3. Regex State
  const [regexPattern, setRegexPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexText, setRegexText] = useState('Liên hệ dev@webos.vn hoặc admin@personal.org để nhận hỗ trợ.');

  // 4. Crypto State
  const [cryptoInput, setCryptoInput] = useState('WebOS-Executive-Key');
  const [cryptoAlgo, setCryptoAlgo] = useState<'sha256' | 'sha512' | 'md5' | 'base64'>('sha256');

  // 5. Timestamp State
  const [timestampInput, setTimestampInput] = useState<string>(() => Date.now().toString());

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    playSound('pop');
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFormatJson = () => {
    playSound('pop');
    const res = formatJson(jsonInput, 2);
    if (res.success && res.data) {
      setJsonInput(res.data);
      setJsonError(null);
    } else {
      setJsonError(res.error || 'JSON không hợp lệ');
    }
  };

  const handleMinifyJson = () => {
    playSound('pop');
    const res = minifyJson(jsonInput);
    if (res.success && res.data) {
      setJsonInput(res.data);
      setJsonError(null);
    } else {
      setJsonError(res.error || 'JSON không hợp lệ');
    }
  };

  const handleGenerateUuids = () => {
    playSound('snap');
    setGeneratedUuids(generateUuid(uuidVersion, uuidCount));
  };

  if (!isOpen) return null;

  const regexRes = testRegex(regexPattern, regexFlags, regexText);
  const cryptoHash = hashString(cryptoInput, cryptoAlgo);
  const timestampRes = convertTimestamp(timestampInput);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-subtle)] shrink-0">
          <div className="flex items-center gap-2">
            <Wrench className="text-[var(--accent)]" size={18} />
            <span className="font-semibold text-sm text-[var(--text-primary)]">
              Bộ công cụ Lập trình viên (Developer Utilities)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-surface-subtle)] px-3 shrink-0 overflow-x-auto">
          {[
            { id: 'json', label: 'JSON Formatter', icon: FileCode },
            { id: 'uuid', label: 'UUID v4/v7', icon: Fingerprint },
            { id: 'regex', label: 'Regex Tester', icon: Regex },
            { id: 'crypto', label: 'Crypto & Base64', icon: KeyRound },
            { id: 'timestamp', label: 'Timestamp', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playSound('pop');
                  setActiveTab(tab.id as UtilityTab);
                }}
                className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  Định dạng hoặc nén chuỗi JSON chuẩn
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleFormatJson}>
                    Định dạng (Format)
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMinifyJson}>
                    Nén (Minify)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('json', jsonInput)}
                  >
                    {copiedKey === 'json' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>

              {jsonError && (
                <div className="text-xs text-rose-400 p-2 rounded bg-rose-500/10 border border-rose-500/20">
                  {jsonError}
                </div>
              )}

              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full text-xs font-mono bg-[#090a0f] border border-[var(--border-color)] rounded-xl p-3 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] leading-relaxed"
              />
            </div>
          )}

          {/* TAB 2: UUID */}
          {activeTab === 'uuid' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Phiên bản:</span>
                  <select
                    value={uuidVersion}
                    onChange={(e) => setUuidVersion(e.target.value as 'v4' | 'v7')}
                    className="text-xs bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
                  >
                    <option value="v4">UUID v4 (Ngẫu nhiên)</option>
                    <option value="v7">UUID v7 (Time-ordered)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Số lượng:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={uuidCount}
                    onChange={(e) => setUuidCount(Number(e.target.value))}
                    className="w-16 text-xs bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-1.5 text-center text-[var(--text-primary)]"
                  />
                </div>

                <Button size="sm" onClick={handleGenerateUuids}>
                  Tạo mới
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy('all_uuid', generatedUuids.join('\n'))}
                >
                  {copiedKey === 'all_uuid' ? 'Đã sao chép tất cả' : 'Sao chép tất cả'}
                </Button>
              </div>

              <div className="space-y-2">
                {generatedUuids.map((u, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] font-mono text-xs text-[var(--text-primary)]"
                  >
                    <span>{u}</span>
                    <button
                      onClick={() => handleCopy(`uuid_${i}`, u)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title="Sao chép"
                    >
                      {copiedKey === `uuid_${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REGEX */}
          {activeTab === 'regex' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Pattern</label>
                  <Input
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Flags</label>
                  <Input
                    value={regexFlags}
                    onChange={(e) => setRegexFlags(e.target.value)}
                    className="font-mono text-xs text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">Chuỗi thử nghiệm</label>
                <textarea
                  rows={4}
                  value={regexText}
                  onChange={(e) => setRegexText(e.target.value)}
                  className="w-full text-xs font-mono bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">Kết quả khớp:</span>
                  <span className="font-mono font-bold text-[var(--accent)]">
                    {regexRes.matches.length} kết quả
                  </span>
                </div>

                {regexRes.error ? (
                  <div className="text-xs text-rose-400">{regexRes.error}</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {regexRes.matches.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CRYPTO */}
          {activeTab === 'crypto' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">Thuật toán:</span>
                <div className="flex gap-1.5">
                  {(['sha256', 'sha512', 'md5', 'base64'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setCryptoAlgo(a)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        cryptoAlgo === a
                          ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-semibold'
                          : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">Chuỗi gốc</label>
                <textarea
                  rows={3}
                  value={cryptoInput}
                  onChange={(e) => setCryptoInput(e.target.value)}
                  className="w-full text-xs font-mono bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">Kết quả băm ({cryptoAlgo.toUpperCase()})</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={cryptoHash}
                    className="font-mono text-xs bg-[#090a0f] text-emerald-400 border-[var(--border-color)]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('crypto', cryptoHash)}
                  >
                    {copiedKey === 'crypto' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TIMESTAMP */}
          {activeTab === 'timestamp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  Nhập Unix timestamp (giây hoặc ms) hoặc chuỗi ISO
                </label>
                <div className="flex gap-2">
                  <Input
                    value={timestampInput}
                    onChange={(e) => setTimestampInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTimestampInput(Date.now().toString())}
                  >
                    Hiện tại (Now)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">ISO 8601 UTC:</span>
                  <div className="font-mono font-semibold text-[var(--text-primary)] select-all truncate">
                    {timestampRes.iso}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Thời gian tương đối:</span>
                  <div className="font-semibold text-emerald-400">
                    {timestampRes.relative}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Unix Seconds:</span>
                  <div className="font-mono font-semibold text-[var(--text-primary)] select-all">
                    {timestampRes.unixSeconds}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Unix Milliseconds:</span>
                  <div className="font-mono font-semibold text-[var(--text-primary)] select-all">
                    {timestampRes.unixMs}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
