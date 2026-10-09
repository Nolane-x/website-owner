import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { getDb, initializeDatabase } from '@/lib/db';
import { profiles, authCredentials, settings, securityEvents } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { getClientIp, rateLimiter } from '@/lib/security/rate-limit';
import { assertValidOrigin } from '@/lib/security/origin-guard';

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
  // P0.5: CSRF / Origin Guard
  const originError = assertValidOrigin(req);
  if (originError) return originError;

  const ip = getClientIp(req.headers);

  // P0.1: Rate limiting cho endpoint bootstrap nhạy cảm (5 lần / 5 phút)
  const rl = rateLimiter.check(`bootstrap:${ip}`, 5, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu khởi tạo từ địa chỉ này. Vui lòng thử lại sau.' },
      { status: 429 }
    );
  }

  try {
    await initializeDatabase();
    const db = getDb();

    // 1. Kiểm tra ban đầu: Bootstrap chỉ được phép chạy khi CHƯA có chủ sở hữu nào
    const preCheck = await db.select().from(profiles).limit(1);
    if (preCheck.length > 0) {
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
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const profileId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    // Initial settings definition
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

    // P0.1: Thực hiện toàn bộ khởi tạo trong Database Transaction nguyên tử
    await db.transaction(async (tx) => {
      // Khóa và kiểm tra lại bên trong transaction chống tranh chấp đồng thời
      const existingInTx = await tx.select().from(profiles).limit(1);
      if (existingInTx.length > 0) {
        throw new Error('BOOTSTRAP_ALREADY_COMPLETED');
      }

      // 2. Tạo hồ sơ Chủ sở hữu
      await tx.insert(profiles).values({
        id: profileId,
        username: username.trim(),
        displayName: displayName.trim(),
        bio: 'Không gian số cá nhân — Personal Web OS',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. Tạo thông tin mật khẩu bảo mật
      await tx.insert(authCredentials).values({
        id: crypto.randomUUID(),
        profileId,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 4. Khởi tạo cài đặt ban đầu (Dual Themes & Dual Navigation)
      for (const s of initialSettings) {
        await tx.insert(settings).values({
          id: crypto.randomUUID(),
          profileId,
          key: s.key,
          valueJson: s.valueJson,
          updatedAt: new Date(),
        });
      }

      // 5. Ghi log kiểm toán khởi tạo
      await tx.insert(securityEvents).values({
        id: crypto.randomUUID(),
        profileId,
        eventType: 'SYSTEM_BOOTSTRAP_INITIALIZED',
        detailsJson: { username: username.trim(), ip },
        ipAddress: ip,
        userAgent,
        createdAt: new Date(),
      });
    });

    // 6. Tạo phiên đăng nhập đầu tiên cho chủ nhân sau khi transaction cam kết thành công
    const { token, expiresAt } = await createSession(profileId, ip, userAgent, true);
    await setSessionCookie(token, expiresAt);

    return NextResponse.json({
      success: true,
      message: 'Khởi tạo không gian số cá nhân thành công!',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOTSTRAP_ALREADY_COMPLETED') {
      return NextResponse.json(
        { error: 'Hệ thống đã được thiết lập bởi một phiên khác. Vui lòng đăng nhập.' },
        { status: 403 }
      );
    }
    console.error('Lỗi thực hiện bootstrap:', error);
    return NextResponse.json(
      { error: 'Không thể hoàn thành khởi tạo hệ thống. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
