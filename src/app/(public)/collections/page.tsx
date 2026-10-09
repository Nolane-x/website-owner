'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  isFeatured?: boolean;
  createdAt: string;
}

export default function PublicCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCollections() {
      try {
        setLoading(true);
        const res = await fetch('/api/public/collections');
        const data = await res.json();
        if (res.ok) {
          setCollections(data.collections || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCollections();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-6 space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Quay về Trang chủ
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
              Bộ Sưu Tập Tuyển Chọn
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Các nhóm chủ đề được tuyển chọn kỹ lưỡng, kết hợp các bài viết, dự án và tài nguyên giá trị.
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Tổng cộng: {collections.length} bộ sưu tập
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-[var(--text-muted)]">
          Đang tải bộ sưu tập...
        </div>
      ) : collections.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-2xl">
          Chưa có bộ sưu tập nào được xuất bản công khai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.slug}`}
              className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-[var(--accent-light)] text-[var(--accent)] group-hover:scale-105 transition-transform">
                    <Layers size={18} />
                  </div>
                  {col.isFeatured && (
                    <Badge variant="outline" className="text-[10px] text-[var(--accent)] border-[var(--accent)]/30">
                      Đặc sắc
                    </Badge>
                  )}
                </div>

                <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {col.name}
                </h2>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                  {col.description || 'Bộ sưu tập các tài liệu và sản phẩm chọn lọc.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)]/70 flex items-center justify-between text-xs text-[var(--accent)] font-semibold">
                <span>Khám phá bộ sưu tập</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
