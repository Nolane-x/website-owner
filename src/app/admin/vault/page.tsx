'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminVaultPage() {
  const [masterPassword, setMasterPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const [items, setItems] = useState<VaultItem[]>([]);
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [username, setUsername] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Dịch vụ Web');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchVaultItems = async () => {
    try {
      const res = await fetch('/api/admin/vault');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải két mật mã:', err);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) {
      setUnlockError('Vui lòng nhập Master Password để mở két.');
      return;
    }

    setUnlockError('');
    setIsUnlocked(true);
    fetchVaultItems();
  };

  // Giải mã mật khẩu của một mục cụ thể
  const handleRevealPassword = async (item: VaultItem) => {
    if (revealedIds[item.id]) {
      setRevealedIds((prev) => ({ ...prev, [item.id]: false }));
      return;
    }

    if (decryptedPasswords[item.id]) {
      setRevealedIds((prev) => ({ ...prev, [item.id]: true }));
      return;
    }

    try {
      const decrypted = await decryptVaultSecret(
        {
          ciphertext: item.ciphertext,
          iv: item.iv,
          salt: item.salt,
        },
        masterPassword
      );

      setDecryptedPasswords((prev) => ({ ...prev, [item.id]: decrypted }));
      setRevealedIds((prev) => ({ ...prev, [item.id]: true }));
    } catch {
      alert('Không thể giải mã mục này. Master Password có thể không khớp với khóa mã hóa của mục.');
    }
  };

  // Sao chép mật khẩu vào clipboard
  const handleCopyPassword = async (item: VaultItem) => {
    let pass = decryptedPasswords[item.id];
    if (!pass) {
      try {
        pass = await decryptVaultSecret(
          {
            ciphertext: item.ciphertext,
            iv: item.iv,
            salt: item.salt,
          },
          masterPassword
        );
        setDecryptedPasswords((prev) => ({ ...prev, [item.id]: pass }));
      } catch {
        alert('Không thể giải mã mục này.');
        return;
      }
    }

    navigator.clipboard.writeText(pass);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !username.trim() || !secretPassword) {
      setCreateError('Vui lòng nhập đầy đủ tên dịch vụ, tài khoản và mật khẩu.');
      return;
    }

    setSubmitting(true);
    setCreateError('');

    try {
      // MÃ HÓA PHÍA CLIENT VỚI AES-256-GCM + PBKDF2 TRƯỚC KHI GỬI SERVER
      const encrypted = await encryptVaultSecret(secretPassword, masterPassword);

      const res = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName,
          username,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt,
          url,
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi khi lưu mục');
      }

      setCreateModalOpen(false);
      setServiceName('');
      setUsername('');
      setSecretPassword('');
      setUrl('');
      fetchVaultItems();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Không thể lưu vào két mật mã.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mục "${name}" khỏi két bảo mật?`)) return;

    try {
      const res = await fetch(`/api/admin/vault?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchVaultItems();
    } catch {
      alert('Không thể xóa mục này.');
    }
  };

  // Khóa két mật mã
  const handleLockVault = () => {
    setIsUnlocked(false);
    setMasterPassword('');
    setDecryptedPasswords({});
    setRevealedIds({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" size={22} />
            <span>Két Mật mã Cá nhân (Zero-Knowledge Vault)</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Mã hóa AES-256-GCM hoàn toàn phía trình duyệt. Máy chủ cơ sở dữ liệu không bao giờ nhìn thấy mật khẩu dạng rõ.
          </p>
        </div>

        {isUnlocked && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-1.5">
              <Plus size={15} />
              <span>Thêm mục mật mã mới</span>
            </Button>
            <Button onClick={handleLockVault} size="sm" variant="outline" className="gap-1.5 text-xs">
              <Lock size={14} />
              <span>Khóa két</span>
            </Button>
          </div>
        )}
      </div>

      {!isUnlocked ? (
        /* Màn hình mở khóa két */
        <div className="flex justify-center py-12">
          <div className="w-full max-w-md p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-xl text-center space-y-6">
            <div className="inline-flex p-4 rounded-full bg-[var(--accent-light)] text-[var(--accent)]">
              <KeyRound size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Mở khóa Két Mật mã</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Nhập Master Password của bạn. Mật khẩu này được sử dụng để suy diễn khóa giải mã Web Crypto trực tiếp trong bộ nhớ trình duyệt.
              </p>
            </div>

            <form onSubmit={handleUnlockVault} className="space-y-4 text-left">
              {unlockError && <p className="text-xs text-[var(--danger)] font-medium text-center">{unlockError}</p>}

              <Input
                type="password"
                placeholder="Nhập Master Password..."
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                autoFocus
              />

              <Button type="submit" className="w-full">
                <Unlock size={16} className="mr-2" />
                Mở khóa Két
              </Button>
            </form>

            <div className="p-3 bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-xl text-left flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--text-secondary)]">
                <strong>Nguyên tắc Zero-Knowledge:</strong> Nếu quên Master Password, các mục mã hóa trong két sẽ không thể khôi phục được vì máy chủ không lưu trữ mật khẩu gốc.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Danh sách các mục trong Két */
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] rounded-2xl">
              <KeyRound size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
              <p className="text-xs text-[var(--text-muted)]">Két mật mã hiện đang trống.</p>
              <Button size="sm" variant="outline" onClick={() => setCreateModalOpen(true)}>
                Thêm thông tin tài khoản đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const isRevealed = revealedIds[item.id];
                const plainPass = decryptedPasswords[item.id] || '••••••••••••';

                return (
                  <div
                    key={item.id}
                    className="p-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl space-y-3 shadow-sm hover:border-[var(--text-secondary)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                          {item.category || 'Tài khoản'}
                        </span>
                        <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {item.serviceName}
                        </h3>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id, item.serviceName)}
                        className="hover:text-red-600 -mr-2 -mt-2"
                        title="Xóa mục"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-[var(--bg-surface-subtle)] rounded-lg">
                        <span className="text-[var(--text-muted)]">Tài khoản:</span>
                        <span className="font-mono font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                          {item.username}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-[var(--bg-surface-subtle)] rounded-lg">
                        <span className="text-[var(--text-muted)]">Mật khẩu:</span>
                        <span className="font-mono text-[var(--text-primary)] truncate max-w-[130px]">
                          {isRevealed ? plainPass : '••••••••••••'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRevealPassword(item)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title={isRevealed ? 'Ẩn' : 'Hiện'}
                          >
                            {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleCopyPassword(item)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="Sao chép"
                          >
                            {copiedId === item.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {item.url && (
                      <div className="pt-2 border-t border-[var(--border-color)]">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium truncate"
                        >
                          <span>{item.url.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Add Vault Item */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent
          title="Thêm mục mật mã mới"
          description="Dữ liệu sẽ được mã hóa AES-256-GCM trước khi truyền về cơ sở dữ liệu."
          className="max-w-md"
        >
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            {createError && <p className="text-xs text-[var(--danger)] font-medium p-2 bg-red-50 dark:bg-red-950/20 rounded">{createError}</p>}

            <Input
              label="Tên dịch vụ *"
              placeholder="VD: GitHub, AWS, Ngân hàng..."
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              autoFocus
            />

            <Input
              label="Tên đăng nhập / Email *"
              placeholder="admin@example.com hoặc username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              type="password"
              label="Mật khẩu bí mật *"
              placeholder="Nhập mật khẩu cần lưu..."
              value={secretPassword}
              onChange={(e) => setSecretPassword(e.target.value)}
            />

            <Input
              label="Đường dẫn đăng nhập (URL)"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-[var(--radius-md,0.625rem)] outline-none"
              >
                <option value="Dịch vụ Web">Dịch vụ Web</option>
                <option value="Hạ tầng & Cloud">Hạ tầng & Cloud</option>
                <option value="Tài chính">Tài chính</option>
                <option value="Cá nhân">Cá nhân</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Mã hóa và Lưu
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
