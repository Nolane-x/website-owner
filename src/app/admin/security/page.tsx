'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Laptop, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Clock, 
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  isTrusted: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SecurityEventItem {
  id: string;
  eventType: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export default function SecurityPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'logs' | 'password'>('sessions');

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/auth/sessions');
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await fetch('/api/admin/security-events?limit=50');
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchEvents();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất thiết bị này không?')) return;
    try {
      setActionLoading(sessionId);
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Đã hủy phiên làm việc thành công.' });
        fetchSessions();
        fetchEvents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Không thể hủy phiên.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogoutAllOther = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất tất cả các thiết bị khác không?')) return;
    try {
      setActionLoading('all');
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Đã đăng xuất thành công tất cả các thiết bị khác.' });
        fetchSessions();
        fetchEvents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Lỗi xử lý yêu cầu.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchEvents();
      } else {
        setPasswordMsg({ type: 'error', text: data.error || 'Không thể đổi mật khẩu.' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Lỗi kết nối mạng.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatEventName = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS': return 'Đăng nhập thành công';
      case 'LOGIN_FAILED': return 'Đăng nhập thất bại';
      case 'LOGOUT': return 'Đăng xuất';
      case 'LOGOUT_ALL': return 'Đăng xuất tất cả';
      case 'PASSWORD_CHANGED': return 'Đổi mật khẩu';
      case 'SESSION_REVOKED': return 'Hủy phiên thiết bị';
      case 'PANIC_LOCK': return 'Khóa khẩn cấp';
      case 'VAULT_ACCESS': return 'Mở két bảo mật';
      default: return type;
    }
  };

  const parseDevice = (ua: string | null) => {
    if (!ua) return 'Không rõ thiết bị';
    if (ua.includes('iPhone') || ua.includes('Android')) return 'Thiết bị di động';
    if (ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Linux')) return 'Linux';
    return 'Trình duyệt web';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-accent/10 text-accent">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-serif font-bold text-foreground">Bảo mật & Phiên làm việc</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý thiết bị đăng nhập, lịch sử bảo mật và phòng thủ đa lớp (Defense-in-depth).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { fetchSessions(); fetchEvents(); }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Làm mới
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogoutAllOther}
            disabled={actionLoading === 'all'}
            className="flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất tất cả thiết bị khác
          </Button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">Đóng</button>
        </div>
      )}

      {/* Security Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tình trạng bảo vệ</span>
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Chuẩn quân sự
            </Badge>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-foreground">Bcrypt + HttpOnly Secure</div>
            <p className="text-xs text-muted-foreground mt-1">
              Khóa token 256-bit chống XSS/CSRF, phòng thủ brute-force sliding-window.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Phiên đang chạy</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
              {sessions.length} thiết bị
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-foreground">Single-Owner Session</div>
            <p className="text-xs text-muted-foreground mt-1">
              Phiên tự động thu hồi khi mật khẩu đổi hoặc nhấn thu hồi tức thì.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Khóa nhanh khẩn cấp</span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Ctrl + Shift + L
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-foreground">Panic Mode Màn hình</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ẩn ngay lập tức toàn bộ nội dung riêng tư sang màn hình tài liệu giả định.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'sessions'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Phiên đăng nhập ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'logs'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Nhật ký kiểm toán ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'password'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Đổi mật khẩu chủ sở hữu
        </button>
      </div>

      {/* TAB 1: SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Các thiết bị đã xác thực</h2>
            <p className="text-xs text-muted-foreground">Hủy phiên sẽ buộc thiết bị đó đăng nhập lại.</p>
          </div>

          {loadingSessions ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Đang tải danh sách phiên...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có phiên làm việc nào.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sessions.map((s) => (
                <div 
                  key={s.id} 
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                    s.isCurrent 
                      ? 'border-accent/40 bg-accent/5' 
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg ${s.isCurrent ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {s.userAgent?.includes('iPhone') || s.userAgent?.includes('Android') ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Laptop className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{parseDevice(s.userAgent)}</span>
                        {s.isCurrent && (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5">Phiên hiện tại</Badge>
                        )}
                        {s.isTrusted && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 flex items-center gap-0.5">
                            <UserCheck className="w-2.5 h-2.5" /> Đã tin cậy
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="font-mono">IP: {s.ipAddress || '127.0.0.1'}</span>
                        <span>Hoạt động: {new Date(s.lastActiveAt).toLocaleString('vi-VN')}</span>
                        <span>Tạo lúc: {new Date(s.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground/80 truncate max-w-md mt-1">
                        {s.userAgent || 'Chưa xác định chuỗi trình duyệt'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!s.isCurrent && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={actionLoading === s.id}
                        className="text-xs"
                      >
                        {actionLoading === s.id ? 'Đang hủy...' : 'Đăng xuất thiết bị'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Lịch sử sự kiện bảo mật gần đây</h2>
            <span className="text-xs text-muted-foreground">Hiển thị tối đa 50 sự kiện mới nhất</span>
          </div>

          {loadingEvents ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Đang tải nhật ký...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chưa có sự kiện bảo mật nào được ghi nhận.</div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Loại sự kiện</th>
                      <th className="py-3 px-4">Địa chỉ IP</th>
                      <th className="py-3 px-4">Chi tiết</th>
                      <th className="py-3 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-xs">
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${
                            ev.eventType.includes('SUCCESS') 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : ev.eventType.includes('FAILED')
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-accent/10 text-accent'
                          }`}>
                            {formatEventName(ev.eventType)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {ev.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                          {ev.details ? JSON.stringify(ev.details) : '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(ev.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PASSWORD CHANGE */}
      {activeTab === 'password' && (
        <div className="max-w-lg mx-auto p-6 rounded-xl border border-border bg-card space-y-5">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-foreground">Đổi mật khẩu tài khoản chủ</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Mật khẩu mới sẽ được băm bảo mật bằng Bcrypt salt 12 rounds. Sau khi đổi mật khẩu, bạn vẫn giữ phiên đăng nhập hiện tại.
          </p>

          {passwordMsg && (
            <div className={`p-3 rounded-lg text-xs ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Mật khẩu hiện tại</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Mật khẩu mới (tối thiểu 8 ký tự)</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Nhập lại mật khẩu mới</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận lại mật khẩu mới"
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Ẩn ký tự' : 'Hiện ký tự'}
              </button>

              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
