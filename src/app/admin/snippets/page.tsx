'use client';

import React, { useState, useEffect } from 'react';
import {
  Code2,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Star,
  Trash2,
  Edit2,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/audio/sound-fx';
import { CodeSnippet } from '@/lib/types';

const COMMON_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
  'bash',
  'dockerfile',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
];

export default function CodeSnippetsPage() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    language: string;
    code: string;
    tags: string;
    isFavorite: boolean;
  }>({
    title: '',
    description: '',
    language: 'typescript',
    code: '',
    tags: '',
    isFavorite: false,
  });

  const fetchSnippets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/snippets');
      if (res.ok) {
        const data = await res.json();
        setSnippets(data.snippets || []);
      }
    } catch (err) {
      console.error('Lỗi tải đoạn mã:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitialSnippets() {
      try {
        const res = await fetch('/api/admin/snippets');
        if (res.ok && !ignore) {
          const data = await res.json();
          setSnippets(data.snippets || []);
        }
      } catch (err) {
        console.error('Lỗi tải đoạn mã:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadInitialSnippets();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingSnippet(null);
    setFormData({
      title: '',
      description: '',
      language: 'typescript',
      code: '',
      tags: '',
      isFavorite: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormData({
      title: snippet.title,
      description: snippet.description || '',
      language: snippet.language,
      code: snippet.code,
      tags: snippet.tags.join(', '),
      isFavorite: snippet.isFavorite,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.code.trim()) return;

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      language: formData.language.trim().toLowerCase(),
      code: formData.code,
      tags: formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      isFavorite: formData.isFavorite,
    };

    try {
      if (editingSnippet) {
        const res = await fetch(`/api/admin/snippets/${editingSnippet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('pop');
          setIsModalOpen(false);
          fetchSnippets();
        }
      } else {
        const res = await fetch('/api/admin/snippets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('snap');
          setIsModalOpen(false);
          fetchSnippets();
        }
      }
    } catch (err) {
      console.error('Lỗi lưu đoạn mã:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đoạn mã này?')) return;
    try {
      const res = await fetch(`/api/admin/snippets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        playSound('pop');
        setSnippets((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Lỗi xóa đoạn mã:', err);
    }
  };

  const handleToggleFavorite = async (snippet: CodeSnippet) => {
    const nextFav = !snippet.isFavorite;
    playSound('pop');
    setSnippets((prev) =>
      prev.map((s) => (s.id === snippet.id ? { ...s, isFavorite: nextFav } : s))
    );

    try {
      await fetch(`/api/admin/snippets/${snippet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: nextFav }),
      });
    } catch (err) {
      console.error('Lỗi cập nhật yêu thích:', err);
      fetchSnippets();
    }
  };

  const handleCopyCode = (snippet: CodeSnippet) => {
    navigator.clipboard.writeText(snippet.code);
    playSound('pop');
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSnippets = snippets.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchLang = langFilter === 'all' || s.language.toLowerCase() === langFilter.toLowerCase();
    const matchFav = !favoriteOnly || s.isFavorite;

    return matchSearch && matchLang && matchFav;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Code2 className="text-[var(--accent)]" size={26} />
            Kho Đoạn mã Lập trình (Developer Snippets Vault)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Lưu trữ, tra cứu và sao chép nhanh các đoạn mã nguồn, câu lệnh CLI và cấu hình thường dùng.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Thêm đoạn mã
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <Input
            placeholder="Tìm theo tiêu đề, cú pháp, thẻ gắn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[var(--bg-surface-subtle)] border-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={15} className="text-[var(--text-muted)] shrink-0" />
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            aria-label="Lọc theo ngôn ngữ lập trình"
            className="text-xs bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none"
          >
            <option value="all">Tất cả ngôn ngữ</option>
            {COMMON_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              playSound('pop');
              setFavoriteOnly((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              favoriteOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold'
                : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Star size={13} className={favoriteOnly ? 'fill-current' : ''} />
            Đã đánh dấu sao
          </button>
        </div>
      </div>

      {/* Snippet Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[var(--text-muted)]">
          Đang nạp kho đoạn mã...
        </div>
      ) : filteredSnippets.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
          <Terminal className="mx-auto text-[var(--text-muted)] mb-3" size={36} />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Không tìm thấy đoạn mã nào
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Lưu lại các regex, đoạn mã SQL, cấu hình Nginx hoặc hàm tiện ích...
          </p>
          <Button onClick={handleOpenCreate} size="sm">
            Tạo đoạn mã đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSnippets.map((snippet) => (
            <div
              key={snippet.id}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm flex flex-col group hover:border-[var(--accent)]/50 transition-all"
            >
              {/* Header */}
              <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface-subtle)]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent)] shrink-0">
                    {snippet.language}
                  </span>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
                    {snippet.title}
                  </h3>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleFavorite(snippet)}
                    className={`p-1.5 rounded transition-colors ${
                      snippet.isFavorite
                        ? 'text-amber-400'
                        : 'text-[var(--text-muted)] hover:text-amber-400'
                    }`}
                    title={snippet.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  >
                    <Star size={14} className={snippet.isFavorite ? 'fill-current' : ''} />
                  </button>

                  <button
                    onClick={() => handleCopyCode(snippet)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                    title="Sao chép toàn bộ mã"
                  >
                    {copiedId === snippet.id ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(snippet)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(snippet.id)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--bg-surface)] transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Description snippet */}
              {snippet.description && (
                <div className="px-3.5 pt-2 text-xs text-[var(--text-muted)] line-clamp-1">
                  {snippet.description}
                </div>
              )}

              {/* Code block */}
              <div className="p-3.5 flex-1 bg-[#090a0f] overflow-x-auto">
                <pre className="text-xs font-mono text-zinc-200 leading-relaxed">
                  <code>{snippet.code}</code>
                </pre>
              </div>

              {/* Footer tags */}
              {snippet.tags.length > 0 && (
                <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-surface-subtle)] flex flex-wrap gap-1.5">
                  {snippet.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                {editingSnippet ? 'Chỉnh sửa đoạn mã' : 'Thêm đoạn mã mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Tiêu đề đoạn mã *
                  </label>
                  <Input
                    required
                    placeholder="Ví dụ: Next.js Middleware Auth Guard..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Ngôn ngữ
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    {COMMON_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Mô tả mục đích
                </label>
                <Input
                  placeholder="Mô tả tóm tắt cách thức hoạt động..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Nội dung mã nguồn *
                </label>
                <textarea
                  required
                  rows={10}
                  placeholder="// Dán mã nguồn vào đây..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full text-xs font-mono bg-[#090a0f] border border-[var(--border-color)] rounded-lg p-3 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-2/3">
                  <Input
                    placeholder="Thẻ gắn (cách nhau bởi dấu phẩy, vd: auth, jwt, security)..."
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.isFavorite}
                    onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    className="rounded border-[var(--border-color)] text-[var(--accent)]"
                  />
                  <span>Đánh dấu yêu thích</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingSnippet ? 'Lưu thay đổi' : 'Thêm vào kho'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
