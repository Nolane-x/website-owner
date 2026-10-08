'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  Save,
  Globe,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  Heading,
  AlignLeft,
  FileCode,
  Image as ImageIcon,
  Quote,
  Code,
  ExternalLink,
  Layers,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VisibilityBadge, StatusBadge } from '@/components/ui/badge';
import { BlockType, ContentStatus } from '@/lib/types';
import { sanitizeHtml } from '@/lib/security/sanitize';

interface BuilderBlock {
  id: string;
  blockType: BlockType;
  sortOrder: number;
  contentJson: Record<string, any>;
  settingsJson: Record<string, any>;
}

export function BuilderCanvasClient({ pageId }: { pageId: string }) {
  const router = useRouter();

  const [page, setPage] = useState<any>(null);
  const [blocks, setBlocks] = useState<BuilderBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Viewport mode: 'desktop' | 'tablet' | 'mobile'
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState(false);

  // Active block being edited
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const fetchPageAndBlocks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data.page);
        setBlocks(data.blocks || []);
      } else {
        router.push('/admin/pages');
      }
    } catch {
      router.push('/admin/pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageAndBlocks();
  }, [pageId]);

  // Add block
  const handleAddBlock = async (type: BlockType) => {
    const defaultContents: Record<string, any> = {
      heading: { text: 'Tiêu đề khối mới', level: 2 },
      text: { text: 'Nhập nội dung đoạn văn ở đây...' },
      markdown: { text: '### Tiêu đề Markdown\n\nNội dung Markdown với **in đậm** và danh sách:\n- Ý 1\n- Ý 2' },
      image: { url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80', caption: 'Mô tả hình ảnh' },
      quote: { text: 'Trích dẫn truyền cảm hứng hoặc danh ngôn nổi bật.', author: 'Tác giả' },
      code: { code: 'console.log("Hello Personal Web OS");', language: 'typescript' },
      card: { title: 'Thẻ thông tin', description: 'Mô tả ngắn gọn về chủ đề này.', linkUrl: '#', linkText: 'Tìm hiểu thêm' },
      button: { text: 'Bấm vào đây', url: '#', style: 'primary' },
      divider: {},
    };

    const newBlock: BuilderBlock = {
      id: 'temp-' + Date.now(),
      blockType: type,
      sortOrder: blocks.length,
      contentJson: defaultContents[type] || {},
      settingsJson: {},
    };

    const updated = [...blocks, newBlock];
    setBlocks(updated);
    setActiveBlockId(newBlock.id);
  };

  // Reorder up / down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...blocks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const withOrder = reordered.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(withOrder);
  };

  // Duplicate block
  const duplicateBlock = (index: number) => {
    const source = blocks[index];
    const duplicate: BuilderBlock = {
      id: 'temp-' + Date.now(),
      blockType: source.blockType,
      sortOrder: index + 1,
      contentJson: JSON.parse(JSON.stringify(source.contentJson)),
      settingsJson: JSON.parse(JSON.stringify(source.settingsJson)),
    };

    const updated = [...blocks];
    updated.splice(index + 1, 0, duplicate);
    const withOrder = updated.map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(withOrder);
  };

  // Delete block
  const deleteBlock = (id: string) => {
    const updated = blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, sortOrder: i }));
    setBlocks(updated);
    if (activeBlockId === id) setActiveBlockId(null);
  };

  // Update block content
  const updateBlockContent = (id: string, newContent: Record<string, any>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, contentJson: { ...b.contentJson, ...newContent } } : b))
    );
  };

  // Save changes
  const handleSaveAll = async (targetStatus?: ContentStatus) => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Cập nhật trang (status nếu có)
      if (targetStatus) {
        await fetch(`/api/admin/pages/${pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: targetStatus,
            visibility: targetStatus === 'PUBLISHED' ? 'PUBLIC' : page.visibility,
          }),
        });
      }

      // 2. Cập nhật blocks
      await fetch(`/api/admin/pages/${pageId}/blocks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });

      setSaveSuccess(true);
      fetchPageAndBlocks();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      alert('Không thể lưu trang.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !page) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xs text-[var(--text-muted)] animate-pulse">Đang mở Trình dựng khối...</div>
      </div>
    );
  }

  const viewportWidths = {
    desktop: 'max-w-4xl',
    tablet: 'max-w-2xl',
    mobile: 'max-w-sm',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 md:-m-6 lg:-m-8 bg-[var(--bg-page)] select-none">
      {/* Top Builder Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-color)] shrink-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/pages">
            <button className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]">
              <ArrowLeft size={16} />
            </button>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--text-primary)]">{page.title}</span>
              <VisibilityBadge visibility={page.visibility} />
              <StatusBadge status={page.status} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">/p/{page.slug}</p>
          </div>
        </div>

        {/* Viewport & Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded text-xs transition-all ${
              viewport === 'desktop' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
            }`}
            title="Desktop (Toàn màn hình)"
          >
            <Monitor size={15} />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded text-xs transition-all ${
              viewport === 'tablet' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
            }`}
            title="Tablet (768px)"
          >
            <Tablet size={15} />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded text-xs transition-all ${
              viewport === 'mobile' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone size={15} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium animate-in fade-in">
              <CheckCircle2 size={14} /> Đã lưu
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-1.5 text-xs"
          >
            <Eye size={14} />
            <span>{previewMode ? 'Chế độ sửa' : 'Xem trước'}</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleSaveAll()}
            isLoading={saving}
            className="gap-1.5 text-xs"
          >
            <Save size={14} />
            <span>Lưu nháp</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveAll(page.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
            isLoading={saving}
            className="gap-1.5 text-xs"
          >
            <Globe size={14} />
            <span>{page.status === 'PUBLISHED' ? 'Hủy xuất bản' : 'Xuất bản ra web'}</span>
          </Button>
        </div>
      </div>

      {/* Main Builder Canvas & Palette */}
      <div className="flex flex-1 overflow-hidden">
        {/* Block Palette (Left Bar) */}
        {!previewMode && (
          <div className="w-56 p-3 bg-[var(--bg-surface)] border-r border-[var(--border-color)] overflow-y-auto space-y-3 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Khối nội dung
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">Bấm vào khối để thêm vào trang:</p>

            <div className="space-y-1.5">
              {[
                { type: 'heading', label: 'Tiêu đề (Heading)', icon: Heading },
                { type: 'text', label: 'Đoạn văn (Text)', icon: AlignLeft },
                { type: 'markdown', label: 'Markdown phong phú', icon: FileCode },
                { type: 'image', label: 'Hình ảnh (Image)', icon: ImageIcon },
                { type: 'quote', label: 'Trích dẫn (Quote)', icon: Quote },
                { type: 'code', label: 'Khối mã nguồn (Code)', icon: Code },
                { type: 'card', label: 'Thẻ giới thiệu (Card)', icon: Layers },
                { type: 'button', label: 'Nút bấm / Link', icon: ExternalLink },
                { type: 'divider', label: 'Đường phân cách', icon: Minus },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleAddBlock(item.type as BlockType)}
                    className="w-full flex items-center gap-2.5 p-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--accent)] border border-[var(--border-color)] rounded-lg transition-all text-left"
                  >
                    <Icon size={14} className="text-[var(--accent)]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Central Canvas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-[var(--bg-page)]">
          <div className={`w-full ${viewportWidths[viewport]} transition-all duration-200 space-y-4`}>
            {blocks.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl p-8">
                <Heading size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Trang chưa có khối nội dung nào.</p>
                <p className="text-xs text-[var(--text-muted)]">Chọn một khối ở thanh bên trái để bắt đầu xây dựng trang.</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`group relative bg-[var(--bg-surface)] border rounded-2xl transition-all shadow-sm ${
                    activeBlockId === block.id && !previewMode
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]'
                      : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                  }`}
                  onClick={() => !previewMode && setActiveBlockId(block.id)}
                >
                  {/* Block Actions Toolbar (when not preview) */}
                  {!previewMode && (
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-surface-subtle)] rounded-t-2xl text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-[var(--accent)]">
                          {block.blockType} #{index + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(index, 'down');
                          }}
                          disabled={index === blocks.length - 1}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(index);
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-surface)]"
                          title="Nhân bản khối"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlock(block.id);
                          }}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                          title="Xóa khối"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Block Content Renderer / Inline Editor */}
                  <div className="p-5">
                    {/* HEADING BLOCK */}
                    {block.blockType === 'heading' && (
                      <div>
                        {!previewMode ? (
                          <div className="space-y-2">
                            <Input
                              value={block.contentJson.text || ''}
                              onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                              placeholder="Tiêu đề khối..."
                              className="font-bold text-lg"
                            />
                            <div className="flex gap-2">
                              {[1, 2, 3].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => updateBlockContent(block.id, { level: lvl })}
                                  className={`px-2 py-0.5 text-xs rounded border ${
                                    block.contentJson.level === lvl
                                      ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                                      : 'border-[var(--border-color)]'
                                  }`}
                                >
                                  H{lvl}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                            {block.contentJson.text}
                          </h2>
                        )}
                      </div>
                    )}

                    {/* TEXT BLOCK */}
                    {block.blockType === 'text' && (
                      <div>
                        {!previewMode ? (
                          <Textarea
                            value={block.contentJson.text || ''}
                            onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                            placeholder="Nhập nội dung đoạn văn..."
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            {block.contentJson.text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* MARKDOWN BLOCK */}
                    {block.blockType === 'markdown' && (
                      <div>
                        {!previewMode ? (
                          <Textarea
                            value={block.contentJson.text || ''}
                            onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                            placeholder="Nhập nội dung Markdown..."
                            rows={5}
                            className="font-mono text-xs"
                          />
                        ) : (
                          <div
                            className="text-sm prose dark:prose-invert max-w-none text-[var(--text-secondary)]"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.contentJson.text || '') }}
                          />
                        )}
                      </div>
                    )}

                    {/* IMAGE BLOCK */}
                    {block.blockType === 'image' && (
                      <div className="space-y-2">
                        {!previewMode ? (
                          <div className="space-y-2">
                            <Input
                              label="Đường dẫn ảnh (URL)"
                              value={block.contentJson.url || ''}
                              onChange={(e) => updateBlockContent(block.id, { url: e.target.value })}
                            />
                            <Input
                              label="Chú thích ảnh"
                              value={block.contentJson.caption || ''}
                              onChange={(e) => updateBlockContent(block.id, { caption: e.target.value })}
                            />
                          </div>
                        ) : null}
                        {block.contentJson.url && (
                          <div className="rounded-xl overflow-hidden border border-[var(--border-color)]">
                            <img src={block.contentJson.url} alt="Block image" className="w-full object-cover max-h-96" />
                            {block.contentJson.caption && (
                              <p className="p-2 text-center text-xs italic text-[var(--text-muted)] bg-[var(--bg-surface-subtle)]">
                                {block.contentJson.caption}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* QUOTE BLOCK */}
                    {block.blockType === 'quote' && (
                      <div>
                        {!previewMode ? (
                          <div className="space-y-2">
                            <Textarea
                              label="Câu trích dẫn"
                              value={block.contentJson.text || ''}
                              onChange={(e) => updateBlockContent(block.id, { text: e.target.value })}
                              rows={2}
                            />
                            <Input
                              label="Tác giả"
                              value={block.contentJson.author || ''}
                              onChange={(e) => updateBlockContent(block.id, { author: e.target.value })}
                            />
                          </div>
                        ) : (
                          <blockquote className="border-l-4 border-[var(--accent)] pl-4 py-1 italic text-[var(--text-primary)]">
                            "{block.contentJson.text}"
                            {block.contentJson.author && (
                              <cite className="block text-xs not-italic text-[var(--text-muted)] mt-1 font-semibold">
                                — {block.contentJson.author}
                              </cite>
                            )}
                          </blockquote>
                        )}
                      </div>
                    )}

                    {/* CODE BLOCK */}
                    {block.blockType === 'code' && (
                      <div>
                        {!previewMode ? (
                          <Textarea
                            value={block.contentJson.code || ''}
                            onChange={(e) => updateBlockContent(block.id, { code: e.target.value })}
                            rows={4}
                            className="font-mono text-xs bg-[var(--bg-surface-subtle)]"
                          />
                        ) : (
                          <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto">
                            <code>{block.contentJson.code}</code>
                          </pre>
                        )}
                      </div>
                    )}

                    {/* CARD BLOCK */}
                    {block.blockType === 'card' && (
                      <div>
                        {!previewMode ? (
                          <div className="space-y-2">
                            <Input
                              label="Tiêu đề thẻ"
                              value={block.contentJson.title || ''}
                              onChange={(e) => updateBlockContent(block.id, { title: e.target.value })}
                            />
                            <Textarea
                              label="Mô tả thẻ"
                              value={block.contentJson.description || ''}
                              onChange={(e) => updateBlockContent(block.id, { description: e.target.value })}
                              rows={2}
                            />
                            <Input
                              label="Đường dẫn liên kết (Link)"
                              value={block.contentJson.linkUrl || ''}
                              onChange={(e) => updateBlockContent(block.id, { linkUrl: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="p-5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-surface-subtle)] space-y-2">
                            <h4 className="font-bold text-sm text-[var(--text-primary)]">{block.contentJson.title}</h4>
                            <p className="text-xs text-[var(--text-secondary)]">{block.contentJson.description}</p>
                            {block.contentJson.linkUrl && (
                              <a href={block.contentJson.linkUrl} className="text-xs text-[var(--accent)] hover:underline inline-block font-semibold">
                                Xem thêm →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DIVIDER BLOCK */}
                    {block.blockType === 'divider' && (
                      <hr className="border-[var(--border-color)] my-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
