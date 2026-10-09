'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DecorativeMesh } from '@/components/ui/decorative-mesh';
import { BrandLogo } from '@/components/ui/brand-logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTrusted, setIsTrusted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    async function checkBootstrap() {
      try {
        const res = await fetch('/api/auth/bootstrap');
        const data = await res.json();
        if (data && data.needsBootstrap) {
          router.replace('/admin/bootstrap');
        }
      } catch {
        // Tiếp tục chế độ login thông thường
      }
    }
    checkBootstrap();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          isTrusted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đăng nhập không thành công.');
        return;
      }

      router.push('/admin');
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      <DecorativeMesh />
      
      <div className="w-full max-w-sm p-8 bg-[var(--bg-surface)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl shadow-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <BrandLogo size={48} withText={false} />
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-[var(--text-primary)]">
              Personal Web OS
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-light">
              Cổng vào không gian số độc quyền của Chủ sở hữu
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Tên đăng nhập"
            placeholder="Tên tài khoản chủ sở hữu"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />

          <Input
            type="password"
            label="Mật khẩu"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isTrusted}
                onChange={(e) => setIsTrusted(e.target.checked)}
                className="rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--border-focus)]"
              />
              <span>Tin cậy thiết bị này (30 ngày)</span>
            </label>
          </div>

          <Button type="submit" className="w-full" size="md" isLoading={loading}>
            <span>Đăng nhập</span>
            <ArrowRight size={16} className="ml-1.5" />
          </Button>
        </form>

        <div className="pt-4 border-t border-[var(--border-color)] text-center">
          <p className="text-[11px] text-[var(--text-muted)] flex items-center justify-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Bảo mật cấp máy chủ · Không yêu cầu mã điện thoại OTP</span>
          </p>
        </div>
      </div>
    </div>
  );
}
