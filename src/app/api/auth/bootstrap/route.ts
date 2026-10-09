import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, authCredentials, settings, securityEvents } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { getClientIp } from '@/lib/security/rate-limit';

const BootstrapSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự').max(32).regex(/^[a-zA-Z0-9_-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu gạch dưới hoặc gạch ngang'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').max(128),
  displayName: z.string().min(1, 'Vui lòng nhập tên hiển thị').max(64),
});

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDb();
    const existing = await db.select().from(profiles).limit(1);
    return NextResponse.json({
      needsBootstrap: existing.length === 0,
    });
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái bootstrap:', error);
    return NextResponse.json({ error: 'Không thể kiểm tra trạng thái bootstrap' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDb();

    // 1. Kiểm tra nghiêm ngặt: Bootstrap chỉ được phép chạy khi CHƯA có chủ sở hữu nào
    const existing = await db.select().from(profiles).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Hệ thống đã được thiết lập. Quy trình khởi tạo (Bootstrap) đã bị vô hiệu hóa vĩnh viễn.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = BootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu khởi tạo không hợp lệ' },
        { status: 400 }
      );
    }

    const { username, password, displayName } = parsed.data;
    const ip = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const profileId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    // 2. Tạo hồ sơ Chủ sở hữu
    await db.insert(profiles).values({
      id: profileId,
      username: username.trim(),
      displayName: displayName.trim(),
      bio: 'Không gian số cá nhân — Personal Web OS',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Tạo thông tin mật khẩu bảo mật
    await db.insert(authCredentials).values({
      id: crypto.randomUUID(),
      profileId,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Khởi tạo cài đặt ban đầu (Dual Themes & Dual Navigation)
    const initialSettings = [
      {
        key: 'theme_private',
        valueJson: {
          mode: 'light',
          fontSans: 'Be Vietnam Pro',
          fontSerif: 'Newsreader',
          fontMono: 'JetBrains Mono',
          accentColor: '#BA4311',
          radius: '0.625rem',
          density: 'comfortable',
        },
      },
      {
        key: 'theme_public',
        valueJson: {
          mode: 'light',
          fontSans: 'Be Vietnam Pro',
          fontSerif: 'Newsreader',
          fontMono: 'JetBrains Mono',
          accentColor: '#BA4311',
          radius: '0.625rem',
          density: 'comfortable',
          customHeaderTitle: displayName.trim(),
        },
      },
      {
        key: 'public_access',
        valueJson: {
          requirePassword: false,
          passwordHint: '',
          allowCopy: true,
          showSearch: true,
          customHeaderTitle: displayName.trim(),
        },
      },
      {
        key: 'private_navigation',
        valueJson: {
          items: [
            { id: 'home', label: 'Bảng điều khiển', href: '/admin', icon: 'LayoutDashboard', visible: true, pinned: true },
            { id: 'notes', label: 'Ghi chú & Bài viết', href: '/admin/content', icon: 'FileText', visible: true, pinned: true },
            { id: 'projects', label: 'Dự án', href: '/admin/projects', icon: 'FolderGit2', visible: true, pinned: true },
            { id: 'resources', label: 'Tài nguyên Link', href: '/admin/resources', icon: 'Bookmark', visible: true, pinned: true },
            { id: 'pages', label: 'Trình dựng Trang', href: '/admin/pages', icon: 'Compass', visible: true, pinned: true },
            { id: 'collections', label: 'Bộ sưu tập', href: '/admin/collections', icon: 'Layers', visible: true, pinned: true },
            { id: 'vault', label: 'Két bảo mật', href: '/admin/vault', icon: 'ShieldCheck', visible: true, pinned: false },
            { id: 'security', label: 'Nhật ký bảo mật', href: '/admin/security', icon: 'Lock', visible: true, pinned: false },
            { id: 'settings', label: 'Cài đặt hệ thống', href: '/admin/settings', icon: 'Settings', visible: true, pinned: true },
          ],
        },
      },
      {
        key: 'public_navigation',
        valueJson: {
          items: [
            { id: 'pub-home', label: 'Trang chủ', href: '/', visible: true },
            { id: 'pub-about', label: 'Giới thiệu', href: '/about', visible: true },
            { id: 'pub-projects', label: 'Dự án', href: '/projects', visible: true },
            { id: 'pub-articles', label: 'Bài viết', href: '/articles', visible: true },
            { id: 'pub-resources', label: 'Tài nguyên', href: '/resources', visible: true },
            { id: 'pub-collections', label: 'Bộ sưu tập', href: '/collections', visible: true },
          ],
        },
      },
    ];

    for (const s of initialSettings) {
      await db.insert(settings).values({
        id: crypto.randomUUID(),
        profileId,
        key: s.key,
        valueJson: s.valueJson,
        updatedAt: new Date(),
      });
    }

    // 5. Ghi log kiểm toán khởi tạo
    await db.insert(securityEvents).values({
      id: crypto.randomUUID(),
      profileId,
      eventType: 'SYSTEM_BOOTSTRAP_INITIALIZED',
      detailsJson: { username: username.trim(), ip },
      ipAddress: ip,
      userAgent,
      createdAt: new Date(),
    });

    // 6. Tạo phiên đăng nhập đầu tiên cho chủ nhân
    const { token, expiresAt } = await createSession(profileId, ip, userAgent, true);
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo không gian số cá nhân thành công!',
    });
  } catch (error) {
    console.error('Lỗi thực hiện bootstrap:', error);
    return NextResponse.json(
      { error: 'Không thể hoàn thành khởi tạo hệ thống. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
