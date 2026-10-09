'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { DecorativeMesh } from '@/components/ui/decorative-mesh';
import { BrandLogo } from '@/components/ui/brand-logo';

export default function AdminBootstrapPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/auth/bootstrap');
        if (res.ok) {
          const data = await res.json();
          if (data && data.needsBootstrap === false) {
            // Đã có owner -> Chuyển về login
            router.replace('/admin/login');
            return;
          }
        } else {
          setError('Không thể kết nối đến máy chủ để kiểm tra trạng thái khởi tạo.');
        }
      } catch {
        // Tiếp tục hiển thị form nếu có lỗi mạng
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [router]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim() || !username.trim() || !password) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có độ dài tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Khởi tạo không thành công.');
        return;
      }

      // Khởi tạo thành công -> Chuyển thẳng vào Admin Dashboard
      router.push('/admin');
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] font-mono text-xs text-[var(--text-muted)]">
        Đang kiểm tra trạng thái hệ thống...
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      <DecorativeMesh />

      <div className="w-full max-w-md p-8 sm:p-10 bg-[var(--bg-surface)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl shadow-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size={52} withText={false} />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px] font-mono mb-2">
              <Sparkles size={12} /> Khởi tạo lần đầu · Bootstrap Duy Nhất
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
              Thiết Lập Chủ Sở Hữu
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-light leading-relaxed">
              Tạo tài khoản Chủ nhân độc quyền cho Personal Web OS. Quy trình này chỉ chạy 1 lần duy nhất trên hệ thống.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleBootstrap} className="space-y-4">
          <Input
            label="Tên hiển thị của bạn"
            placeholder="Ví dụ: Nguyễn Văn A hoặc Chủ Sở Hữu"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Tên đăng nhập (Username)"
            placeholder="ví dụ: admin, owner, sovereign"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            type="password"
            label="Mật khẩu khởi tạo"
            placeholder="Tối thiểu 8 ký tự an toàn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            type="password"
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu vừa đặt"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" className="w-full mt-2" size="md" isLoading={loading}>
            <span>Khởi Tạo & Đăng Nhập Ngay</span>
            <ArrowRight size={16} className="ml-1.5" />
          </Button>
        </form>

        <div className="pt-4 border-t border-[var(--border-color)] text-center">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Mật khẩu được băm Bcrypt salt 12 · Tuyệt đối không lưu plaintext</span>
          </p>
        </div>
      </div>
    </div>
  );
}
