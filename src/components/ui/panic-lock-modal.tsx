'use client';

import React, { useState } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

export function PanicLockOverlay({
  isLocked,
  onUnlock,
  onLogout,
}: {
  isLocked: boolean;
  onUnlock: () => void;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prevLocked, setPrevLocked] = useState(isLocked);

  if (isLocked !== prevLocked) {
    setPrevLocked(isLocked);
    setPassword('');
    setError('');
  }

  if (!isLocked) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Xác thực lại với API login
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        onLogout();
        return;
      }
      const data = (await res.json()) as { profile?: { username?: string } };
      const username = data.profile?.username;

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        setError('Mật khẩu không chính xác.');
        return;
      }

      onUnlock();
    } catch {
      setError('Đã xảy ra lỗi khi mở khóa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in-0 duration-200">
      <div className="w-full max-w-sm mx-4 p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <Lock size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Không gian làm việc đã khóa
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Chế độ Khóa Khẩn cấp (Panic Lock) đã ẩn toàn bộ nội dung nhạy cảm. Nhập mật khẩu để tiếp tục làm việc.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4 text-left">
          {error && <p className="text-xs text-[var(--danger)] font-medium text-center">{error}</p>}

          <Input
            type="password"
            placeholder="Nhập mật khẩu chủ sở hữu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            <KeyRound size={16} className="mr-2" />
            Mở khóa không gian
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-full text-xs text-[var(--text-muted)] hover:text-red-600"
          >
            Đăng xuất khỏi thiết bị này
          </Button>
        </form>
      </div>
    </div>
  );
}
