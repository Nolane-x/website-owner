'use client';

import React, { useState } from 'react';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';

export function GuestPasswordModal({
  open,
  passwordHint,
  onSuccess,
}: {
  open: boolean;
  passwordHint?: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật mã khách.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Mật mã không đúng.');
        return;
      }

      onSuccess();
    } catch {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-200">
      <div className="w-full max-w-sm mx-4 p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
          <ShieldCheck size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Trang web bảo vệ bằng Mật mã Khách
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Chủ sở hữu đã thiết lập mật mã khách để xem nội dung công khai này.
          </p>
          {passwordHint && (
            <p className="text-xs italic text-[var(--accent)] bg-[var(--accent-light)] py-1.5 px-3 rounded-md">
              Gợi ý: {passwordHint}
            </p>
          )}
        </div>

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          {error && <p className="text-xs text-[var(--danger)] font-medium text-center">{error}</p>}

          <Input
            type="password"
            placeholder="Nhập mật mã khách..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            <KeyRound size={16} className="mr-2" />
            Mở xem nội dung
          </Button>
        </form>
      </div>
    </div>
  );
}
