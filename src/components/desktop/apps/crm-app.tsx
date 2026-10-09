'use client';

import React, { useState, useEffect } from 'react';
import { Users, Clock, Shield, Plus, Phone, Mail, Building, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  role: string;
  organization?: string;
  category: 'colleague' | 'mentor' | 'client' | 'partner' | 'other';
  email?: string;
  phone?: string;
  lastInteractionAt?: string;
  followUpDays: number;
  notes?: string;
  neverCloudAi: boolean;
  isOverdue?: boolean;
}

export function PersonalCrmApp() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form thêm
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<Contact['category']>('colleague');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [followUpDays, setFollowUpDays] = useState(14);
  const [notes, setNotes] = useState('');
  const [neverCloudAi, setNeverCloudAi] = useState(false);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        if (data.contacts?.length > 0 && !selectedContact) {
          setSelectedContact(data.contacts[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          organization,
          category,
          email,
          phone,
          followUpDays,
          notes,
          neverCloudAi,
        }),
      });
      if (res.ok) {
        setName('');
        setRole('');
        setOrganization('');
        setEmail('');
        setPhone('');
        setNotes('');
        setShowAddModal(false);
        loadContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkInteractedToday = async () => {
    if (!selectedContact) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/admin/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedContact,
          lastInteractionAt: today,
        }),
      });
      if (res.ok) {
        setSelectedContact({ ...selectedContact, lastInteractionAt: today, isOverdue: false });
        loadContacts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Personal CRM & Relationship Memory</h1>
            <p className="text-xs text-stone-400">Quản lý quan hệ cá nhân có đạo đức: Riêng tư tuyệt đối và chu kỳ chăm sóc</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Liên Hệ</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Contact List Column */}
        <div className="w-80 border-r border-stone-800 bg-stone-900/30 p-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
            Danh bạ ({contacts.length})
          </div>
          {contacts.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className={`p-3.5 rounded-xl cursor-pointer transition border ${
                selectedContact?.id === c.id
                  ? 'bg-rose-500/10 border-rose-500/30 text-white'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{c.name}</span>
                {c.isOverdue && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                    Cần kết nối
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-400 mt-1 truncate">
                {c.role} {c.organization ? `• ${c.organization}` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Detail Right */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {selectedContact ? (
            <>
              <div className="flex items-start justify-between p-6 rounded-3xl bg-stone-900 border border-stone-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">{selectedContact.name}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-medium capitalize">
                      {selectedContact.category}
                    </span>
                    {selectedContact.neverCloudAi && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center">
                        <Shield className="w-3 h-3 mr-1" /> Không gửi lên AI
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-400">
                    {selectedContact.role} {selectedContact.organization ? `tại ${selectedContact.organization}` : ''}
                  </p>
                </div>

                <button
                  onClick={handleMarkInteractedToday}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 font-medium text-xs flex items-center transition border border-stone-700"
                >
                  <Calendar className="w-4 h-4 mr-1.5" /> Ghi nhận gặp gỡ hôm nay
                </button>
              </div>

              {/* Status and Follow up */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-1">
                  <span className="text-xs text-stone-400">Lần tương tác gần nhất</span>
                  <div className="text-sm font-semibold text-white">
                    {selectedContact.lastInteractionAt || 'Chưa ghi nhận'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-1">
                  <span className="text-xs text-stone-400">Chu kỳ chăm sóc</span>
                  <div className="text-sm font-semibold text-white">
                    Mỗi {selectedContact.followUpDays} ngày
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-1">
                  <span className="text-xs text-stone-400">Trạng thái gắn kết</span>
                  <div className={`text-sm font-semibold ${selectedContact.isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedContact.isOverdue ? 'Đã quá hạn tương tác' : 'Quan hệ đang duy trì tốt'}
                  </div>
                </div>
              </div>

              {/* Contact info & Notes */}
              <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Thông tin liên hệ & Ghi chú</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center space-x-2 text-stone-300">
                    <Mail className="w-4 h-4 text-stone-500" />
                    <span>{selectedContact.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-stone-300">
                    <Phone className="w-4 h-4 text-stone-500" />
                    <span>{selectedContact.phone || 'Chưa có số điện thoại'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-xs text-stone-400 block mb-1 font-semibold">Ghi chú & Cam kết chưa hoàn thành:</label>
                  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 text-xs whitespace-pre-wrap leading-relaxed min-h-[100px]">
                    {selectedContact.notes || 'Chưa có ghi chú đặc biệt.'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-500 text-sm">
              Chọn một liên hệ từ danh sách bên trái.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Thêm Liên Hệ Quan Hệ Mới</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Chức vụ / Vai trò</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Tổ chức / Công ty</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nhóm quan hệ</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none"
                >
                  <option value="colleague">Đồng nghiệp (Colleague)</option>
                  <option value="mentor">Cố vấn (Mentor)</option>
                  <option value="partner">Đối tác (Partner)</option>
                  <option value="client">Khách hàng (Client)</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Chu kỳ nhắc nhở (ngày)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={followUpDays}
                  onChange={(e) => setFollowUpDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400 block mb-1">Ghi chú cuộc gặp / Cam kết</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="neverAi"
                checked={neverCloudAi}
                onChange={(e) => setNeverCloudAi(e.target.checked)}
                className="rounded border-stone-700 text-rose-500 focus:ring-0"
              />
              <label htmlFor="neverAi" className="text-xs text-stone-300">
                Riêng tư nghiêm ngặt: Không bao giờ gửi liên hệ này vào context của AI đám mây
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                Lưu Liên Hệ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
