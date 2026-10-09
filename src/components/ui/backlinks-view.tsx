'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, FileText, ExternalLink } from 'lucide-react';
import { playSound } from '@/lib/audio/sound-fx';

interface BacklinkItem {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  linkText: string;
}

export function BacklinksView({ targetId }: { targetId: string }) {
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchBacklinks = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/links/backlinks?targetId=${targetId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setBacklinks(data.backlinks || []);
        }
      } catch (err) {
        console.error('Lỗi nạp liên kết 2 chiều:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (targetId) {
      fetchBacklinks();
    }
    return () => {
      isMounted = false;
    };
  }, [targetId]);

  if (loading) {
    return (
      <div className="py-4 text-xs text-[var(--text-muted)] italic">
        Đang quét liên kết 2 chiều...
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="py-4 text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-xl p-3 text-center">
        Chưa có trang hoặc ghi chú nào trích dẫn đến bài viết này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowLeftRight size={15} className="text-[var(--accent)]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Liên kết 2 chiều trỏ tới ({backlinks.length})
        </h4>
      </div>

      <div className="space-y-2">
        {backlinks.map((bl) => (
          <Link
            key={bl.id}
            href={`/admin/content/${bl.sourceId}`}
            onClick={() => playSound('pop')}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] hover:border-[var(--accent)]/50 transition-all text-xs group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-[var(--accent)] shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {bl.sourceTitle}
                </span>
                {bl.linkText && bl.linkText !== bl.sourceTitle && (
                  <span className="text-[10px] text-[var(--text-muted)] block truncate">
                    Được gắn qua từ khóa: &quot;{bl.linkText}&quot;
                  </span>
                )}
              </div>
            </div>

            <ExternalLink size={12} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
