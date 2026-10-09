'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CodeSnippet } from '@/lib/types';
import { Terminal, Plus, Trash2, Copy, Check, Search, Loader2 } from 'lucide-react';

export function SnippetsApp() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // New snippet
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/snippets');
      if (res.ok) {
        const data = await res.json();
        setSnippets(data.snippets || []);
        if (data.snippets?.length > 0 && !selectedSnippet) {
          setSelectedSnippet(data.snippets[0]);
        }
      }
    } catch (e) {
      console.error('Lỗi tải snippets:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedSnippet]);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          language,
          code: code.trim(),
          tags: [language],
        }),
      });

      if (res.ok) {
        setTitle('');
        setCode('');
        fetchSnippets();
      }
    } catch (e) {
      console.error('Lỗi tạo snippet:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa đoạn mã này?')) return;
    try {
      await fetch(`/api/admin/snippets/${id}`, { method: 'DELETE' });
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      if (selectedSnippet?.id === id) setSelectedSnippet(null);
    } catch (e) {
      console.error('Lỗi xóa snippet:', e);
    }
  };

  const handleCopy = (snip: CodeSnippet) => {
    navigator.clipboard.writeText(snip.code);
    setCopiedId(snip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = snippets.filter((s) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.language.toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full bg-stone-950 text-stone-200 text-xs">
      {/* Left sidebar: list & search */}
      <div className="w-64 border-r border-stone-800 flex flex-col bg-stone-900/40">
        <div className="p-2.5 border-b border-stone-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm snippets..."
              className="w-full pl-7 pr-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-300 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="p-4 text-center text-stone-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
              <span>Đang tải...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-stone-600">Không có đoạn mã nào</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSnippet(s)}
                className={`w-full text-left p-2 rounded-lg transition flex items-center justify-between ${
                  selectedSnippet?.id === s.id
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : 'hover:bg-stone-800/60 text-stone-300'
                }`}
              >
                <div className="truncate flex-1">
                  <p className="font-semibold truncate">{s.title}</p>
                  <span className="text-[10px] text-stone-500 font-mono uppercase">{s.language}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right side: Viewer or Create Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSnippet ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-100 text-sm">{selectedSnippet.title}</h3>
                <span className="font-mono text-[10px] text-emerald-400 uppercase">
                  {selectedSnippet.language}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedSnippet)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                >
                  {copiedId === selectedSnippet.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(selectedSnippet.id)}
                  className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <pre className="flex-1 p-3 overflow-auto font-mono text-[11px] bg-stone-950 text-stone-200 select-text leading-relaxed">
              <code>{selectedSnippet.code}</code>
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-stone-500">
            <Terminal className="w-10 h-10 mb-2 opacity-30" />
            <p>Chọn đoạn mã bên trái hoặc tạo mới dưới đây</p>
          </div>
        )}

        {/* Quick Add Bottom Bar */}
        <form onSubmit={handleCreate} className="p-3 border-t border-stone-800 bg-stone-900/50 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề đoạn mã..."
              className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
              required
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300 focus:outline-hidden"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash / Shell</option>
              <option value="json">JSON</option>
              <option value="html">HTML/CSS</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !code.trim()}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-medium disabled:opacity-50 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lưu</span>
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={2}
            placeholder="Dán mã nguồn vào đây..."
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 font-mono text-[11px] text-stone-200 placeholder-stone-600 focus:outline-hidden"
            required
          />
        </form>
      </div>
    </div>
  );
}
