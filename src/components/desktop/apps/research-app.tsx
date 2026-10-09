'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ResearchSource, Claim, ClaimStatus } from '@/lib/types';
import {
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export function ResearchApp() {
  const [activeTab, setActiveTab] = useState<'sources' | 'claims'>('sources');

  // Sources
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAuthor, setSourceAuthor] = useState('');
  const [sourceExcerpt, setSourceExcerpt] = useState('');

  // Claims
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimLoading, setClaimLoading] = useState(true);
  const [claimStatement, setClaimStatement] = useState('');
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('unreviewed');
  const [claimNotes, setClaimNotes] = useState('');

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/research');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (e) {
      console.error('Lỗi tải nguồn nghiên cứu:', e);
    } finally {
      setSourceLoading(false);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/research/claims');
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (e) {
      console.error('Lỗi tải mệnh đề:', e);
    } finally {
      setClaimLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      fetchSources();
      fetchClaims();
    });
  }, [fetchSources, fetchClaims]);

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTitle.trim()) return;

    try {
      const res = await fetch('/api/admin/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceTitle.trim(),
          url: sourceUrl.trim() || null,
          author: sourceAuthor.trim() || null,
          excerpt: sourceExcerpt.trim() || null,
          status: 'captured',
        }),
      });

      if (res.ok) {
        setSourceTitle('');
        setSourceUrl('');
        setSourceAuthor('');
        setSourceExcerpt('');
        fetchSources();
      }
    } catch (e) {
      console.error('Lỗi lưu nguồn:', e);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Xóa tài liệu này?')) return;
    try {
      await fetch(`/api/admin/research/${id}`, { method: 'DELETE' });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error('Lỗi xóa nguồn:', e);
    }
  };

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimStatement.trim()) return;

    try {
      const res = await fetch('/api/admin/research/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement: claimStatement.trim(),
          status: claimStatus,
          notes: claimNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setClaimStatement('');
        setClaimNotes('');
        fetchClaims();
      }
    } catch (e) {
      console.error('Lỗi tạo mệnh đề:', e);
    }
  };

  const handleDeleteClaim = async (id: string) => {
    if (!confirm('Xóa mệnh đề này?')) return;
    try {
      await fetch(`/api/admin/research/claims?id=${id}`, { method: 'DELETE' });
      setClaims((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error('Lỗi xóa mệnh đề:', e);
    }
  };

  const getClaimStatusBadge = (st: ClaimStatus) => {
    switch (st) {
      case 'supported':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            <span>Đã xác thực</span>
          </span>
        );
      case 'disputed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Đang tranh cãi</span>
          </span>
        );
      case 'refuted':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>Đã bác bỏ</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-400">
            <HelpCircle className="w-3 h-3" />
            <span>Chưa thẩm định</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Tab navigation */}
      <div className="p-2 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'sources'
                ? 'bg-stone-800 text-emerald-400 border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Nguồn tài liệu nghiên cứu ({sources.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              activeTab === 'claims'
                ? 'bg-stone-800 text-emerald-400 border border-stone-700'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Bảng Mệnh đề & Bằng chứng ({claims.length})
          </button>
        </div>

        <button
          onClick={() => {
            fetchSources();
            fetchClaims();
          }}
          title="Làm mới"
          className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Sources tab */}
      {activeTab === 'sources' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sourceLoading ? (
              <div className="py-12 text-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-cyan-400" />
                <span>Đang tải tài liệu...</span>
              </div>
            ) : sources.length === 0 ? (
              <div className="py-12 text-center text-stone-600">
                Chưa có tài liệu nghiên cứu nào. Thêm nguồn mới ở dưới.
              </div>
            ) : (
              sources.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-200">{s.title}</h4>
                    {s.author && <p className="text-[11px] text-stone-400 mt-0.5">Tác giả: {s.author}</p>}
                    {s.excerpt && (
                      <p className="text-[11px] text-stone-300 italic mt-1 line-clamp-2">
                        &ldquo;{s.excerpt}&rdquo;
                      </p>
                    )}
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:underline text-[11px] mt-1.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[280px]">{s.url}</span>
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSource(s.id)}
                    className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCreateSource} className="p-3 border-t border-stone-800 bg-stone-900/50 flex flex-col gap-2">
            <span className="font-semibold text-stone-300">Thêm nguồn tài liệu mới</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="Tiêu đề bài nghiên cứu / sách / tài liệu..."
                className="col-span-2 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
                required
              />
              <input
                type="text"
                value={sourceAuthor}
                onChange={(e) => setSourceAuthor(e.target.value)}
                placeholder="Tác giả (tùy chọn)..."
                className="col-span-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-1/2 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
              />
              <input
                type="text"
                value={sourceExcerpt}
                onChange={(e) => setSourceExcerpt(e.target.value)}
                placeholder="Đoạn trích dẫn chính..."
                className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold px-3 py-1 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lưu nguồn</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Claims tab */}
      {activeTab === 'claims' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {claimLoading ? (
              <div className="py-12 text-center text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-400" />
                <span>Đang tải mệnh đề...</span>
              </div>
            ) : claims.length === 0 ? (
              <div className="py-12 text-center text-stone-600">
                Chưa có mệnh đề nào. Thêm mệnh đề để kiểm định bằng chứng.
              </div>
            ) : (
              claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getClaimStatusBadge(c.status)}
                    </div>
                    <p className="font-semibold text-stone-200 text-xs leading-relaxed">
                      {c.statement}
                    </p>
                    {c.notes && (
                      <p className="text-[11px] text-stone-400 mt-1">Ghi chú: {c.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteClaim(c.id)}
                    className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCreateClaim} className="p-3 border-t border-stone-800 bg-stone-900/50 flex flex-col gap-2">
            <span className="font-semibold text-stone-300">Tạo mệnh đề mới</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={claimStatement}
                onChange={(e) => setClaimStatement(e.target.value)}
                placeholder="Tuyên bố / Mệnh đề cần chứng minh hoặc tranh biện..."
                className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
                required
              />
              <select
                value={claimStatus}
                onChange={(e) => setClaimStatus(e.target.value as ClaimStatus)}
                className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300 focus:outline-hidden"
              >
                <option value="unreviewed">Chưa thẩm định</option>
                <option value="supported">Đã xác thực</option>
                <option value="disputed">Đang tranh cãi</option>
                <option value="refuted">Đã bác bỏ</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                placeholder="Lập luận / Bằng chứng đối chiếu..."
                className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm mệnh đề</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
