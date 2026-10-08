'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Sparkles, Shield, Code, Cpu, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicAboutPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/site')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <div className="border-b border-[var(--border-color)] pb-6 space-y-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> Quay về Trang chủ
        </Link>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-primary)] tracking-tight">
          Về Chủ Sở Hữu & Web OS
        </h1>
        <p className="text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
          Tìm hiểu về triết lý xây dựng hệ điều hành số cá nhân và hành trình kỹ thuật.
        </p>
      </div>

      {/* Profile Bio Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-serif font-bold shrink-0 shadow-md">
            {profile?.displayName?.charAt(0) || 'A'}
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
                {profile?.displayName || 'Chủ Sở Hữu'}
              </h2>
              <span className="text-xs font-mono text-[var(--accent)]">
                Kiến trúc sư & Kỹ sư Phần mềm
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {profile?.bio || 'Tác giả và người quản trị duy nhất của hệ thống Personal Web OS. Nơi giao thoa giữa công nghệ, tư duy thiết kế Bàn Giấy và lưu trữ tri thức lâu bền.'}
            </p>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text-primary)]">
          Nguyên Tắc Thiết Kế Hệ Thống
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
            <div className="p-2 w-fit rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Shield size={18} />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Phân Tách Tuyệt Đối</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Dữ liệu riêng tư không bao giờ được gửi qua API công khai để lọc tại trình duyệt. Mọi quyền truy cập đều được kiểm soát nghiêm ngặt tại Backend.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
            <div className="p-2 w-fit rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Code size={18} />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Lưu Trữ Liên Kết Trước</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Tối ưu dung lượng máy chủ bằng triết lý Link-First Storage, tích hợp tài nguyên phân tán qua Google Drive, GitHub và dịch vụ đám mây.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
            <div className="p-2 w-fit rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Sparkles size={18} />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Mỹ Học Bàn Giấy (NUI)</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Thiết kế tĩnh lặng, đậm chất xưởng in và tài liệu học thuật với bảng màu trung tính, phông chữ thanh lịch và độ tương phản cao.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-2">
            <div className="p-2 w-fit rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
              <Cpu size={18} />
            </div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Tốc Độ & Độ Tin Cậy</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Không phụ thuộc vào các dịch vụ SaaS bên thứ ba đắt đỏ. Khởi tạo nhanh chóng, cơ sở dữ liệu nhúng PGlite hoặc PostgreSQL độc lập.
            </p>
          </div>
        </div>
      </section>

      {/* Connect */}
      <section className="pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          Bạn muốn trao đổi về dự án hoặc kiến trúc?
        </span>
        <Link href="/projects">
          <Button variant="outline" size="sm" className="text-xs">
            Khám phá dự án <ExternalLink size={12} className="ml-1.5" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
