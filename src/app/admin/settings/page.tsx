'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Lock, 
  LayoutDashboard, 
  Download, 
  Upload, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'theme' | 'public' | 'dashboard' | 'backup'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Theme State
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('dark');
  const [accentColor, setAccentColor] = useState('#E66828');
  const [fontFamily, setFontFamily] = useState('serif');
  const [borderRadius, setBorderRadius] = useState('0.625rem');

  // Public Access State
  const [requireGuestPassword, setRequireGuestPassword] = useState(false);
  const [hasPasswordSet, setHasPasswordSet] = useState(false);
  const [newGuestPassword, setNewGuestPassword] = useState('');
  const [guestPasswordHint, setGuestPasswordHint] = useState('');
  const [allowPublicCopy, setAllowPublicCopy] = useState(true);
  const [showPublicSearch, setShowPublicSearch] = useState(true);
  const [siteTitle, setSiteTitle] = useState('Personal Web OS');

  // Dashboard Layout State
  const [widgetStats, setWidgetStats] = useState(true);
  const [widgetRecentNotes, setWidgetRecentNotes] = useState(true);
  const [widgetPinnedProjects, setWidgetPinnedProjects] = useState(true);
  const [widgetLinks, setWidgetLinks] = useState(true);
  const [widgetSecurityStatus, setWidgetSecurityStatus] = useState(true);

  // Backup & Restore State
  const [importJsonText, setImportJsonText] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        if (data.profile) {
          setDisplayName(data.profile.displayName || '');
          setBio(data.profile.bio || '');
          setAvatarUrl(data.profile.avatarUrl || '');
        }

        const s = data.settings || {};
        if (s.theme) {
          setThemeMode(s.theme.mode || 'dark');
          setAccentColor(s.theme.accent || '#E66828');
          setFontFamily(s.theme.fontFamily || 'serif');
          setBorderRadius(s.theme.borderRadius || '0.625rem');
        }

        if (s.public_access) {
          setRequireGuestPassword(Boolean(s.public_access.requirePassword));
          setHasPasswordSet(Boolean(s.public_access.hasPasswordSet));
          setGuestPasswordHint(s.public_access.passwordHint || '');
          setAllowPublicCopy(s.public_access.allowCopy ?? true);
          setShowPublicSearch(s.public_access.showSearch ?? true);
          setSiteTitle(s.public_access.customHeaderTitle || 'Personal Web OS');
        }

        if (s.dashboard_layout) {
          const w = s.dashboard_layout.widgets || {};
          setWidgetStats(w.stats ?? true);
          setWidgetRecentNotes(w.recentNotes ?? true);
          setWidgetPinnedProjects(w.pinnedProjects ?? true);
          setWidgetLinks(w.links ?? true);
          setWidgetSecurityStatus(w.securityStatus ?? true);
        }
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', text: 'Không thể tải thông tin cài đặt.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileUpdates: { displayName, bio, avatarUrl }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: 'Đã lưu thông tin hồ sơ thành công!' });
      } else {
        setNotification({ type: 'error', text: data.error || 'Lỗi khi lưu hồ sơ.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Lỗi mạng khi lưu hồ sơ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'theme',
          value: {
            mode: themeMode,
            accent: accentColor,
            fontFamily,
            borderRadius,
          }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: 'Đã cập nhật hệ thống Theme thành công!' });
      } else {
        setNotification({ type: 'error', text: data.error || 'Lỗi khi cập nhật Theme.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Lỗi mạng khi cập nhật Theme.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePublicAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'public_access',
          value: {
            requirePassword: requireGuestPassword,
            newPublicPassword: newGuestPassword,
            passwordHint: guestPasswordHint,
            allowCopy: allowPublicCopy,
            showSearch: showPublicSearch,
            customHeaderTitle: siteTitle,
          }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: 'Đã cập nhật cài đặt chế độ khách công khai!' });
        setNewGuestPassword('');
        fetchSettings();
      } else {
        setNotification({ type: 'error', text: data.error || 'Lỗi khi lưu cài đặt khách.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Lỗi mạng khi cập nhật.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDashboardLayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'dashboard_layout',
          value: {
            widgets: {
              stats: widgetStats,
              recentNotes: widgetRecentNotes,
              pinnedProjects: widgetPinnedProjects,
              links: widgetLinks,
              securityStatus: widgetSecurityStatus,
            }
          }
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: 'Đã cập nhật bố cục Bảng điều khiển!' });
      } else {
        setNotification({ type: 'error', text: data.error || 'Lỗi khi lưu bố cục.' });
      }
    } catch {
      setNotification({ type: 'error', text: 'Lỗi mạng khi cập nhật.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = () => {
    window.open('/api/admin/export', '_blank');
  };

  const handleImportBackup = async () => {
    if (!importJsonText.trim()) {
      alert('Vui lòng dán dữ liệu JSON cần khôi phục.');
      return;
    }
    if (!confirm('Hành động này sẽ nhập dữ liệu vào cơ sở dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) return;

    try {
      setImporting(true);
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', text: `Khôi phục dữ liệu thành công! Đã xử lý ${data.restoredCount || 'các'} bản ghi.` });
        setImportJsonText('');
      } else {
        setNotification({ type: 'error', text: data.error || 'Lỗi xử lý file sao lưu.' });
      }
    } catch (e: any) {
      setNotification({ type: 'error', text: 'Dữ liệu JSON không hợp lệ: ' + e.message });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-serif">
          <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải cấu hình hệ thống...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-accent/10 text-accent">
              <SettingsIcon className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold text-foreground">Cài đặt Hệ thống</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Trung tâm tùy biến hồ sơ, hệ màu Bàn Giấy, mật mã khách và dữ liệu sao lưu.
          </p>
        </div>
      </div>

      {notification && (
        <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">Đóng</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4" /> Hồ sơ cá nhân
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'theme'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" /> Giao diện & Theme
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'public'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Lock className="w-4 h-4" /> Chế độ Khách (Guest)
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Bố cục Dashboard
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Download className="w-4 h-4" /> Sao lưu & Khôi phục
        </button>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-xl border border-border bg-card space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Hồ sơ chủ sở hữu duy nhất</h2>
              <p className="text-xs text-muted-foreground">Thông tin này xuất hiện trên trang giới thiệu cá nhân và website công khai.</p>
            </div>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tên hiển thị công khai</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Đường dẫn ảnh đại diện (Avatar URL)</label>
              <Input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Tiểu sử tóm tắt (Bio)</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu đôi nét về bản thân, chuyên môn và đam mê..."
              rows={4}
            />
          </div>
        </form>
      )}

      {/* TAB 2: THEME */}
      {activeTab === 'theme' && (
        <form onSubmit={handleSaveTheme} className="p-6 rounded-xl border border-border bg-card space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Theme Engine & NUI Tokens</h2>
              <p className="text-xs text-muted-foreground">Tùy biến bảng màu Bàn Giấy, chế độ sáng/tối và phông chữ toàn hệ thống.</p>
            </div>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Áp dụng Theme'}
            </Button>
          </div>

          {/* Theme Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Chế độ hiển thị</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'dark', label: 'Tối (Bàn Giấy Đêm)', desc: 'Nền mực đen ấm áp, dịu mắt' },
                { id: 'light', label: 'Sáng (Giấy Cũ Mộc)', desc: 'Nền giấy thủ công ấm áp, thanh tao' },
                { id: 'system', label: 'Theo hệ thống', desc: 'Tự động theo thiết bị' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setThemeMode(item.id as any)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    themeMode === item.id 
                      ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                      : 'border-border bg-muted/20 hover:border-accent/40'
                  }`}
                >
                  <div className="font-semibold text-sm text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Color & Typography Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Màu điểm nhấn (Accent Color)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Kiểu phông tiêu đề</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
              >
                <option value="serif">Cổ điển Serif (Playfair / Lora)</option>
                <option value="sans">Hiện đại Sans-serif (Inter / Be Vietnam)</option>
                <option value="mono">Kỹ thuật Monospace (JetBrains Mono)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Bo góc viền (Radius)</label>
              <select
                value={borderRadius}
                onChange={(e) => setBorderRadius(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
              >
                <option value="0.25rem">Sắc nét (0.25rem)</option>
                <option value="0.625rem">Tiêu chuẩn Bàn Giấy (0.625rem)</option>
                <option value="1rem">Tròn mềm mại (1rem)</option>
              </select>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PUBLIC ACCESS */}
      {activeTab === 'public' && (
        <form onSubmit={handleSavePublicAccess} className="p-6 rounded-xl border border-border bg-card space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Bảo vệ & Tùy chọn Chế độ Khách (Public Mode)</h2>
              <p className="text-xs text-muted-foreground">Mật mã khách hoàn toàn tách biệt với mật khẩu chủ sở hữu.</p>
            </div>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu cấu hình khách'}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Yêu cầu mật khẩu khách để xem trang công khai</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Khi bật, khách truy cập vào website công khai sẽ thấy màn hình yêu cầu mật khẩu trước khi xem nội dung.
                </div>
              </div>
              <input
                type="checkbox"
                checked={requireGuestPassword}
                onChange={(e) => setRequireGuestPassword(e.target.checked)}
                className="w-5 h-5 rounded border-border accent-accent cursor-pointer"
              />
            </div>

            {requireGuestPassword && (
              <div className="pt-3 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    {hasPasswordSet ? 'Đổi mật mã khách mới (Để trống nếu giữ nguyên)' : 'Đặt mật mã khách mới'}
                  </label>
                  <Input
                    type="password"
                    value={newGuestPassword}
                    onChange={(e) => setNewGuestPassword(e.target.value)}
                    placeholder="Nhập mật mã dành cho khách"
                  />
                  {hasPasswordSet && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block">
                      ✓ Đang có mật mã khách hoạt động.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Gợi ý mật mã (Hiển thị cho khách nếu cần)</label>
                  <Input
                    value={guestPasswordHint}
                    onChange={(e) => setGuestPasswordHint(e.target.value)}
                    placeholder="Ví dụ: Tên công ty hoặc câu chào bí mật"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tiêu đề Website công khai (Header Title)</label>
              <Input
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="Personal Web OS"
              />
            </div>

            <div className="space-y-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={allowPublicCopy}
                  onChange={(e) => setAllowPublicCopy(e.target.checked)}
                  className="rounded border-border accent-accent"
                />
                Cho phép khách sao chép nội dung công khai (Copy text / code)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={showPublicSearch}
                  onChange={(e) => setShowPublicSearch(e.target.checked)}
                  className="rounded border-border accent-accent"
                />
                Hiển thị thanh tìm kiếm công khai (Ctrl+K cho khách)
              </label>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: DASHBOARD LAYOUT */}
      {activeTab === 'dashboard' && (
        <form onSubmit={handleSaveDashboardLayout} className="p-6 rounded-xl border border-border bg-card space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Tùy biến Bảng điều khiển riêng (Private Dashboard)</h2>
              <p className="text-xs text-muted-foreground">Bật hoặc ẩn các khối tiện ích (Widgets) hiển thị tại trang chủ Admin.</p>
            </div>
            <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu bố cục'}
            </Button>
          </div>

          <div className="space-y-3">
            {[
              { id: 'stats', label: 'Khối thống kê tổng quan (Thẻ số lượng nội dung, dự án, tài nguyên, trang)', val: widgetStats, set: setWidgetStats },
              { id: 'recentNotes', label: 'Khối ghi chú & bài viết gần đây', val: widgetRecentNotes, set: setWidgetRecentNotes },
              { id: 'pinnedProjects', label: 'Khối dự án nổi bật được ghim', val: widgetPinnedProjects, set: setWidgetPinnedProjects },
              { id: 'links', label: 'Khối liên kết tài nguyên nhanh (Drive, GitHub, Mega)', val: widgetLinks, set: setWidgetLinks },
              { id: 'securityStatus', label: 'Khối thông tin phòng thủ & phiên bảo mật', val: widgetSecurityStatus, set: setWidgetSecurityStatus },
            ].map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                <span className="text-sm text-foreground">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.val}
                  onChange={(e) => item.set(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                />
              </div>
            ))}
          </div>
        </form>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sao lưu toàn bộ hệ thống (JSON Export)</h2>
                <p className="text-xs text-muted-foreground">
                  Tải về tập tin JSON chứa toàn bộ bài viết, dự án, tài nguyên, trang khối Canvas và danh mục.
                </p>
              </div>
              <Button onClick={handleExportBackup} className="flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Xuất tập tin sao lưu JSON
              </Button>
            </div>
            <div className="text-xs text-muted-foreground bg-accent/5 p-3 rounded-lg border border-accent/20">
              💡 Dữ liệu tải về sẽ không bao gồm mật khẩu chủ sở hữu đã băm hoặc dữ liệu két sắt chưa giải mã nhằm đảm bảo an toàn tuyệt đối.
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card space-y-4">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-semibold text-foreground">Khôi phục từ bản sao lưu (JSON Import)</h2>
              <p className="text-xs text-muted-foreground">
                Dán nội dung tập tin JSON đã sao lưu để khôi phục cấu trúc dữ liệu vào Web OS của bạn.
              </p>
            </div>

            <Textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Dán mã JSON sao lưu vào đây..."
              rows={8}
              className="font-mono text-xs"
            />

            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                onClick={handleImportBackup}
                disabled={importing || !importJsonText.trim()}
                className="flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" /> {importing ? 'Đang khôi phục...' : 'Bắt đầu khôi phục'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
