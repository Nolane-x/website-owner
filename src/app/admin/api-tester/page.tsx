'use client';

import React, { useState } from 'react';
import {
  Send,
  Globe,
  Clock,
  Database,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/audio/sound-fx';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

export default function ApiTesterPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { id: 'h1', key: 'Accept', value: 'application/json' },
  ]);
  const [requestBody, setRequestBody] = useState('{\n  "title": "Test request"\n}');
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');

  // Response State
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    durationMs: number;
    sizeBytes: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isPrettyJson, setIsPrettyJson] = useState(true);

  const handleAddHeader = () => {
    playSound('pop');
    setHeaders((prev) => [...prev, { id: crypto.randomUUID(), key: '', value: '' }]);
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const handleHeaderChange = (id: string, field: 'key' | 'value', val: string) => {
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h))
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    playSound('snap');
    setLoading(true);
    setResponse(null);
    setErrorMsg(null);

    const headersObj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) {
        headersObj[h.key.trim()] = h.value.trim();
      }
    });

    try {
      const res = await fetch('/api/admin/http-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          method,
          headers: headersObj,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? requestBody : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || data.details || 'Yêu cầu thất bại');
        playSound('pop');
      } else {
        setResponse(data);
        if (data.status >= 200 && data.status < 300) {
          playSound('chime');
        } else {
          playSound('pop');
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    playSound('pop');
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  let formattedBody = response?.body || '';
  if (response && isPrettyJson) {
    try {
      const parsed = JSON.parse(response.body);
      formattedBody = JSON.stringify(parsed, null, 2);
    } catch {
      // Keep raw
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
          <Globe className="text-[var(--accent)]" size={26} />
          Trình Thử nghiệm Yêu cầu API (Mini HTTP Request Tester)
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Gửi yêu cầu REST API an toàn qua proxy server-side không bị hạn chế bởi CORS trình duyệt.
        </p>
      </div>

      {/* Main Request Form */}
      <form onSubmit={handleSend} className="space-y-4">
        {/* URL Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border-color)] shadow-sm">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            aria-label="Phương thức HTTP"
            className="text-xs font-bold font-mono px-3 py-2 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <Input
            required
            type="url"
            placeholder="https://api.example.com/v1/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 font-mono text-xs bg-[var(--bg-surface-subtle)] border-none"
          />

          <Button type="submit" disabled={loading} className="flex items-center gap-2 text-xs shrink-0">
            <Send size={14} />
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </Button>
        </div>

        {/* Request Tabs: Headers & Body */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-surface-subtle)] px-3">
            <button
              type="button"
              onClick={() => setActiveTab('headers')}
              className={`py-2 px-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'headers'
                  ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Headers ({headers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('body')}
              className={`py-2 px-3 text-xs font-medium border-b-2 transition-all ${
                activeTab === 'body'
                  ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Request Body
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'headers' ? (
              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Tên Header (Authorization, Content-Type...)"
                      value={h.key}
                      onChange={(e) => handleHeaderChange(h.id, 'key', e.target.value)}
                      className="font-mono text-xs flex-1"
                    />
                    <Input
                      placeholder="Giá trị Header..."
                      value={h.value}
                      onChange={(e) => handleHeaderChange(h.id, 'value', e.target.value)}
                      className="font-mono text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(h.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-rose-500 rounded"
                      title="Xóa Header"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddHeader}
                  className="mt-2 text-xs flex items-center gap-1.5"
                >
                  <Plus size={13} /> Thêm Header
                </Button>
              </div>
            ) : (
              <div>
                <textarea
                  rows={6}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder="Dán JSON payload vào đây..."
                  className="w-full text-xs font-mono bg-[#090a0f] border border-[var(--border-color)] rounded-lg p-3 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Response Section */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {response && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm space-y-0 animate-in fade-in">
          {/* Response Meta Header */}
          <div className="p-3.5 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface-subtle)]">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : response.status >= 400
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}
              >
                {response.status} {response.statusText}
              </span>

              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-mono">
                <Clock size={13} /> {response.durationMs}ms
              </span>

              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-mono">
                <Database size={13} /> {(response.sizeBytes / 1024).toFixed(2)} KB
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrettyJson((prev) => !prev)}
                className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                  isPrettyJson
                    ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)] font-semibold'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-muted)]'
                }`}
              >
                JSON Format
              </button>

              <button
                onClick={handleCopyResponse}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Sao chép toàn bộ phản hồi"
              >
                {copiedResponse ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedResponse ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* Response Body */}
          <div className="p-4 bg-[#090a0f] overflow-x-auto max-h-96">
            <pre className="text-xs font-mono text-zinc-200 leading-relaxed">
              <code>{formattedBody}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
