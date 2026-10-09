'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
  Server,
  Code,
  Coffee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/audio/sound-fx';
import { Subscription, SubscriptionCategory, BillingCycle, SubscriptionStatus } from '@/lib/types';

const CATEGORY_MAP: Record<SubscriptionCategory, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  infrastructure: { label: 'Hạ tầng / VPS / Domain', icon: Server },
  ai: { label: 'Trí tuệ nhân tạo (AI)', icon: Sparkles },
  developer: { label: 'Công cụ Lập trình', icon: Code },
  lifestyle: { label: 'Đời sống / Giải trí', icon: Coffee },
};

export default function SubscriptionsPage() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Subscription | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    category: SubscriptionCategory;
    cost: number;
    currency: 'VND' | 'USD';
    billingCycle: BillingCycle;
    nextBillingDate: string;
    status: SubscriptionStatus;
    url: string;
    notes: string;
  }>({
    name: '',
    category: 'infrastructure',
    cost: 0,
    currency: 'VND',
    billingCycle: 'monthly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    status: 'active',
    url: '',
    notes: '',
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setItems(data.subscriptions || []);
      }
    } catch (err) {
      console.error('Lỗi nạp dịch vụ định kỳ:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadInitialSubscriptions() {
      try {
        const res = await fetch('/api/admin/subscriptions');
        if (res.ok && !ignore) {
          const data = await res.json();
          setItems(data.subscriptions || []);
        }
      } catch (err) {
        console.error('Lỗi nạp dịch vụ định kỳ:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadInitialSubscriptions();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'infrastructure',
      cost: 0,
      currency: 'VND',
      billingCycle: 'monthly',
      nextBillingDate: new Date().toISOString().split('T')[0],
      status: 'active',
      url: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingItem(sub);
    setFormData({
      name: sub.name,
      category: sub.category,
      cost: sub.cost,
      currency: sub.currency,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      status: sub.status,
      url: sub.url || '',
      notes: sub.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      cost: Number(formData.cost) || 0,
      currency: formData.currency,
      billingCycle: formData.billingCycle,
      nextBillingDate: formData.nextBillingDate,
      status: formData.status,
      url: formData.url.trim() || null,
      notes: formData.notes.trim() || null,
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/admin/subscriptions/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('pop');
          setIsModalOpen(false);
          fetchSubscriptions();
        }
      } else {
        const res = await fetch('/api/admin/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          playSound('snap');
          setIsModalOpen(false);
          fetchSubscriptions();
        }
      }
    } catch (err) {
      console.error('Lỗi lưu dịch vụ:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        playSound('pop');
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error('Lỗi xóa dịch vụ:', err);
    }
  };

  // Tính tổng chi phí quy đổi ước lượng
  const USD_VND_RATE = 25400;
  const activeSubs = items.filter((i) => i.status === 'active');

  const monthlyVndTotal = activeSubs.reduce((acc, curr) => {
    let costInVnd = curr.currency === 'USD' ? curr.cost * USD_VND_RATE : curr.cost;
    if (curr.billingCycle === 'yearly') costInVnd = Math.round(costInVnd / 12);
    return acc + costInVnd;
  }, 0);

  const yearlyVndTotal = monthlyVndTotal * 12;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <CreditCard className="text-[var(--accent)]" size={26} />
            Quản trị Chi phí & Đăng ký Dịch vụ
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Theo dõi hạ tầng VPS, tên miền, tài khoản AI và các công cụ định kỳ của bạn.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Thêm dịch vụ
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-muted)] font-medium">Chi phí ước tính / Tháng</span>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)] font-mono">
            {monthlyVndTotal.toLocaleString('vi-VN')} ₫
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
            ~ ${(monthlyVndTotal / USD_VND_RATE).toFixed(2)} USD / tháng
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-muted)] font-medium">Chi phí ước tính / Năm</span>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)] font-mono text-[var(--accent)]">
            {yearlyVndTotal.toLocaleString('vi-VN')} ₫
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
            ~ ${(yearlyVndTotal / USD_VND_RATE).toFixed(2)} USD / năm
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-muted)] font-medium">Tổng dịch vụ hoạt động</span>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)] font-mono">
            {activeSubs.length} / {items.length}
          </div>
          <span className="text-[11px] text-emerald-500 mt-1 block">
            Đang thanh toán tự động
          </span>
        </div>
      </div>

      {/* Subscriptions Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[var(--text-muted)]">
          Đang nạp dữ liệu chi phí...
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CreditCard className="mx-auto text-[var(--text-muted)] mb-3" size={36} />
          <p className="text-sm text-[var(--text-primary)] font-semibold">Chưa có dịch vụ đăng ký nào</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Theo dõi chi phí Cloudflare, VPS Hetzner, Claude Pro, ChatGPT...
          </p>
          <Button onClick={handleOpenCreate} size="sm">
            Thêm dịch vụ đầu tiên
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-surface-subtle)] border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Dịch vụ</th>
                  <th className="px-4 py-3 font-semibold">Phân loại</th>
                  <th className="px-4 py-3 font-semibold">Chi phí</th>
                  <th className="px-4 py-3 font-semibold">Chu kỳ</th>
                  <th className="px-4 py-3 font-semibold">Gia hạn tới</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {items.map((sub) => {
                  const CatIcon = CATEGORY_MAP[sub.category].icon;
                  return (
                    <tr key={sub.id} className="hover:bg-[var(--bg-surface-subtle)] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--accent)]">
                            <CatIcon size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                              {sub.name}
                              {sub.url && (
                                <a
                                  href={sub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            {sub.notes && (
                              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{sub.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)]">
                        {CATEGORY_MAP[sub.category].label}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-semibold text-xs text-[var(--text-primary)]">
                        {sub.currency === 'VND'
                          ? `${sub.cost.toLocaleString('vi-VN')} ₫`
                          : `$${sub.cost}`}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-[var(--text-muted)]">
                        {sub.billingCycle === 'monthly' ? 'Hàng tháng' : 'Hàng năm'}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--text-muted)]">
                        {sub.nextBillingDate}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : sub.status === 'paused'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {sub.status === 'active' ? 'Hoạt động' : sub.status === 'paused' ? 'Tạm dừng' : 'Đã hủy'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
                            title="Sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-semibold text-base text-[var(--text-primary)]">
                {editingItem ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ định kỳ'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Tên dịch vụ *
                </label>
                <Input
                  required
                  placeholder="Ví dụ: Hetzner Cloud, GitHub Copilot, Claude..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Phân loại
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as SubscriptionCategory })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="infrastructure">Hạ tầng / VPS / Domain</option>
                    <option value="ai">Trí tuệ nhân tạo (AI)</option>
                    <option value="developer">Công cụ Lập trình</option>
                    <option value="lifestyle">Đời sống / Giải trí</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Chu kỳ thanh toán
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) =>
                      setFormData({ ...formData, billingCycle: e.target.value as BillingCycle })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="monthly">Hàng tháng</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Số tiền *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Đơn vị tiền tệ
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value as 'VND' | 'USD' })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="VND">VND (₫)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Ngày gia hạn kế tiếp
                  </label>
                  <Input
                    type="date"
                    required
                    value={formData.nextBillingDate}
                    onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as SubscriptionStatus })
                    }
                    className="w-full text-sm bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg p-2 text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="paused">Tạm dừng</option>
                    <option value="canceled">Đã hủy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Đường dẫn quản lý (URL)
                </label>
                <Input
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Ghi chú
                </label>
                <Input
                  placeholder="Gói Pro, thanh toán qua thẻ visa..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
