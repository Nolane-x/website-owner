'use client';

import React, { useState, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { encryptVaultSecret, decryptVaultSecret } from '@/lib/security/vault-crypto';

interface VaultItem {
  id: string;
  serviceName: string;
  username: string | null;
  url: string | null;
  category: string | null;
  ciphertext: string;
  iv: string;
  salt: string;
}

export function VaultApp() {
  const [masterPassword, setMasterPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<VaultItem[]>([]);
  const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New item form
  const [serviceName, setServiceName] = useState('');
  const [username, setUsername] = useState('');
  const [secretVal, setSecretVal] = useState('');
  const [category, setCategory] = useState('api_key');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async (masterPwd?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/vault');
      if (res.ok) {
        const data = await res.json();
        const list: VaultItem[] = data.items || [];
        setItems(list);

        const pwdToUse = masterPwd || masterPassword;
        if (pwdToUse) {
          const decryptedMap: Record<string, string> = {};
          for (const item of list) {
            try {
              const plain = await decryptVaultSecret(
                {
                  ciphertext: item.ciphertext,
                  iv: item.iv,
                  salt: item.salt,
                },
                pwdToUse
              );
              decryptedMap[item.id] = plain;
            } catch {
              // Ignore decryption failure for individual item
            }
          }
          setDecryptedSecrets(decryptedMap);
        }
      }
    } catch (e) {
      console.error('Lỗi tải vault:', e);
    } finally {
      setLoading(false);
    }
  }, [masterPassword]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim()) return;

    setUnlockError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/vault');
      if (!res.ok) throw new Error('Không thể kết nối đến Vault.');
      const data = await res.json();
      const list: VaultItem[] = data.items || [];
      setItems(list);

      if (list.length > 0) {
        // F2-25: Kiểm tra giải mã trên toàn bộ items, tránh việc 1 item hỏng khóa toàn bộ két
        let anySuccess = false;
        const decryptedMap: Record<string, string> = {};

        for (const item of list) {
          try {
            const plain = await decryptVaultSecret(
              {
                ciphertext: item.ciphertext,
                iv: item.iv,
                salt: item.salt,
              },
              masterPassword
            );
            decryptedMap[item.id] = plain;
            anySuccess = true;
          } catch {
            // Mục lỗi không khóa toàn bộ két mà được ghi nhận
          }
        }

        if (anySuccess) {
          setDecryptedSecrets(decryptedMap);
          setIsUnlocked(true);
        } else {
          setUnlockError('Mật khẩu Master không chính xác.');
        }
      } else {
        // Vault is empty, allow unlocking
        setIsUnlocked(true);
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Lỗi mở khóa.');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setMasterPassword('');
    setDecryptedSecrets({});
    setRevealedIds({});
    // F2-26: Xóa form state và thông tin nhạy cảm khi khóa
    setServiceName('');
    setUsername('');
    setSecretVal('');
    setUnlockError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !secretVal.trim()) return;

    try {
      setIsSubmitting(true);
      const enc = await encryptVaultSecret(
        secretVal.trim(),
        masterPassword
      );

      const res = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: serviceName.trim(),
          username: username.trim() || null,
          category,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          salt: enc.salt,
        }),
      });

      if (res.ok) {
        setServiceName('');
        setUsername('');
        setSecretVal('');
        fetchItems();
      }
    } catch (e) {
      console.error('Lỗi tạo mục bí mật:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này khỏi Vault?')) return;
    try {
      const res = await fetch(`/api/admin/vault?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        alert('Không thể xóa mục khỏi két bảo mật.');
      }
    } catch (e) {
      console.error('Lỗi xóa secret:', e);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-950 p-6 text-stone-200 text-xs">
        <div className="w-full max-w-sm backdrop-blur-xl bg-stone-900/80 border border-stone-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base text-white">Két mật mã Zero-Knowledge</h3>
          <p className="text-stone-400 text-[11px] mt-1 mb-4 leading-relaxed">
            Nhập Mật khẩu Master để giải mã an toàn trên trình duyệt (AES-256-GCM). Máy chủ không bao giờ lưu trữ khóa giải mã.
          </p>

          <form onSubmit={handleUnlock} className="w-full space-y-3">
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Nhập Master Password..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 text-center tracking-wider focus:outline-hidden focus:border-amber-500"
              required
              autoFocus
            />

            {unlockError && (
              <p className="text-rose-400 text-[11px] font-medium">{unlockError}</p>
            )}

            <button
              type="submit"
              disabled={loading || !masterPassword.trim()}
              className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold py-2 rounded-xl transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span>Mở khóa Két an toàn</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200 text-xs">
      {/* Top Header: Unlocked indicator & Lock button */}
      <div className="p-3 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-stone-100">Két an toàn (Đã mở khóa)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
            AES-256-GCM
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchItems()}
            title="Làm mới"
            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-rose-950 hover:text-rose-300 text-stone-300 transition"
          >
            <Lock className="w-3 h-3" />
            <span>Khóa ngay</span>
          </button>
        </div>
      </div>

      {/* Secret items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-stone-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
            <span>Đang giải mã bí mật...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-stone-600">
            Két đang trống. Hãy thêm khóa API hoặc mật khẩu bên dưới.
          </div>
        ) : (
          items.map((item) => {
            const secret = decryptedSecrets[item.id] || '••••••••••••';
            const isRevealed = Boolean(revealedIds[item.id]);

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-stone-900/70 border border-stone-800 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-stone-800 text-amber-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-stone-200 truncate">{item.serviceName}</h4>
                      {item.category && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-stone-800 text-stone-400 uppercase">
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.username && (
                      <p className="text-[11px] text-stone-400 mt-0.5">{item.username}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px] text-emerald-400">
                      <span>{isRevealed ? secret : '••••••••••••••••'}</span>
                      <button
                        onClick={() =>
                          setRevealedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="text-stone-500 hover:text-stone-300 transition"
                      >
                        {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item.id, secret)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 rounded hover:bg-rose-950 text-stone-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add new secret */}
      <form onSubmit={handleCreate} className="p-3 border-t border-stone-800 bg-stone-900/50 flex flex-col gap-2">
        <span className="font-semibold text-stone-300">Thêm mục bí mật mới</span>
        <div className="grid grid-cols-4 gap-2">
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="Tên dịch vụ (VD: OpenAI, GitHub)..."
            className="col-span-2 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
            required
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tài khoản / Email (tùy chọn)..."
            className="col-span-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="col-span-1 bg-stone-950 border border-stone-700 rounded-lg px-2 py-1 text-xs text-stone-300 focus:outline-hidden"
          >
            <option value="api_key">API Key</option>
            <option value="password">Mật khẩu</option>
            <option value="token">Token</option>
            <option value="server">Máy chủ SSH</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="password"
            value={secretVal}
            onChange={(e) => setSecretVal(e.target.value)}
            placeholder="Giá trị bí mật (sẽ được mã hóa AES-256-GCM)..."
            className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-hidden"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !serviceName.trim() || !secretVal.trim()}
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-1 rounded-lg disabled:opacity-50 transition"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Mã hóa & Lưu</span>
          </button>
        </div>
      </form>
    </div>
  );
}
