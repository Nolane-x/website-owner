import crypto from 'crypto';
import { getDb, initializeDatabase } from './index';
import { profiles, authCredentials, settings, contentItems, pages, contentBlocks, collections, collectionItems } from './schema';
import { hashPassword } from '../auth/password';
import { eq } from 'drizzle-orm';

export async function ensureSeedData() {
  await initializeDatabase();
  const db = getDb();

  // Kiểm tra nếu đã có tài khoản Owner
  const existingProfiles = await db.select().from(profiles).limit(1);
  if (existingProfiles.length > 0) {
    return existingProfiles[0];
  }

  // RULE P0.1: Production TUYỆT ĐỐI KHÔNG tự động tạo owner/password mẫu dưới mọi tình huống kể cả khi ENABLE_DEV_SEED=true
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Trong môi trường development hoặc test: chỉ seed khi explicit flag ENABLE_DEV_SEED === 'true' hoặc NODE_ENV === 'test'
  const allowDevSeed = process.env.ENABLE_DEV_SEED === 'true' || process.env.NODE_ENV === 'test';
  if (!allowDevSeed) {
    return null;
  }

  const profileId = 'owner-primary-id';
  const initialUsername = process.env.INITIAL_OWNER_USERNAME || 'admin';
  const initialPassword = process.env.INITIAL_OWNER_PASSWORD || 'DevOwner@2026';

  const passwordHash = await hashPassword(initialPassword);

  // 1. Tạo hồ sơ Chủ sở hữu
  await db.insert(profiles).values({
    id: profileId,
    username: initialUsername,
    displayName: 'Chủ Sở Hữu',
    bio: 'Không gian số cá nhân — Personal Web OS, Nghiên cứu, Dự án & Tài nguyên.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 2. Tạo thông tin mật khẩu
  await db.insert(authCredentials).values({
    id: crypto.randomUUID(),
    profileId,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 3. Cài đặt mặc định
  const defaultSettings = [
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
      },
    },
    {
      key: 'dashboard_layout',
      valueJson: {
        widgets: [
          { id: 'stats', type: 'statistics', title: 'Tổng quan hệ thống', enabled: true, order: 1, width: 'full' },
          { id: 'quick_actions', type: 'quick_actions', title: 'Thao tác nhanh', enabled: true, order: 2, width: 'full' },
          { id: 'recent_notes', type: 'recent_notes', title: 'Ghi chú & Soạn thảo gần đây', enabled: true, order: 3, width: 'half' },
          { id: 'pinned_projects', type: 'pinned_projects', title: 'Dự án đã ghim', enabled: true, order: 4, width: 'half' },
          { id: 'drafts', type: 'drafts', title: 'Bản nháp chờ xuất bản', enabled: true, order: 5, width: 'half' },
          { id: 'resources', type: 'resources', title: 'Tài nguyên liên kết gần đây', enabled: true, order: 6, width: 'half' },
        ],
      },
    },
    {
      key: 'public_access',
      valueJson: {
        requirePassword: false,
        passwordHint: '',
        allowCopy: true,
        showSearch: true,
        customHeaderTitle: 'Personal Web OS',
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

  for (const s of defaultSettings) {
    await db.insert(settings).values({
      id: crypto.randomUUID(),
      profileId,
      key: s.key,
      valueJson: s.valueJson,
      updatedAt: new Date(),
    });
  }

  // 4. Khởi tạo một số nội dung mẫu chất lượng cao
  // A. Ghi chú cá nhân (PRIVATE)
  const privateNoteId = crypto.randomUUID();
  await db.insert(contentItems).values({
    id: privateNoteId,
    profileId,
    title: 'Ghi chú kiến trúc hệ thống Personal Web OS',
    slug: 'ghi-chu-kien-truc-he-thong',
    type: 'note',
    description: 'Bản thảo ý tưởng về việc phân tách tuyệt đối giữa Private Workspace và Public Mode.',
    content: `# Kiến trúc Phân tách Dữ liệu

1. Private API chỉ phục vụ cho Owner sau khi xác thực HttpOnly Session Token.
2. Public API độc lập hoàn toàn, chỉ truy vấn các bản ghi có \`visibility = 'PUBLIC'\` và \`status = 'PUBLISHED'\`.
3. Không bao giờ lọc dữ liệu ở phía client!`,
    visibility: 'PRIVATE',
    status: 'DRAFT',
    tags: ['Architecture', 'Bảo mật', 'WebOS'],
    category: 'Ghi chú',
    sortOrder: 0,
    isFeatured: false,
    isPinned: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // B. Dự án công khai (PUBLIC, PUBLISHED)
  const publicProjectId = crypto.randomUUID();
  await db.insert(contentItems).values({
    id: publicProjectId,
    profileId,
    title: 'Hệ điều hành Web Cá nhân — Personal Web OS',
    slug: 'personal-web-os',
    type: 'project',
    description: 'Một hệ điều hành web cá nhân kết hợp CMS dạng khối, không gian làm việc riêng tư và website công khai.',
    content: `## Giới thiệu Dự án
Personal Web OS là giải pháp toàn diện cho một cá nhân muốn làm chủ hoàn toàn dữ liệu, bài viết, tài nguyên và không gian số của mình.

### Tính năng cốt lõi:
- **Private Workspace**: Quản lý ghi chú, dự án, tài nguyên, phiên làm việc an toàn.
- **Canvas Page Builder**: Bộ dựng khối trực quan linh hoạt.
- **Link-First Storage**: Tích hợp các kho lưu trữ ngoài (Google Drive, GitHub, Mega).
- **Public Website**: Trang thông tin cá nhân tốc độ cao, giao diện tối ưu.`,
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    tags: ['Next.js', 'PostgreSQL', 'TypeScript', 'WebOS'],
    category: 'Phần mềm',
    sortOrder: 0,
    isFeatured: true,
    isPinned: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });

  // C. Tài nguyên Link-First (PUBLIC, PUBLISHED)
  const resourceItemId = crypto.randomUUID();
  await db.insert(contentItems).values({
    id: resourceItemId,
    profileId,
    title: 'Kho Tài Liệu Nghiên Cứu Hệ Thống (Google Drive)',
    slug: 'kho-tai-lieu-nghien-cuu-drive',
    type: 'resource',
    description: 'Tổng hợp tài liệu kiến trúc, sơ đồ phân tích và hướng dẫn triển khai lưu trên Google Drive.',
    content: 'Tài liệu hướng dẫn triển khai thực tế trên Vercel và Cloudflare.',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    tags: ['Google Drive', 'Tài liệu', 'Nghiên cứu'],
    category: 'Tài liệu',
    metadata: {
      url: 'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
      provider: 'Google Drive',
      downloadAllowed: true,
      openInNewTab: true,
    },
    sortOrder: 1,
    isFeatured: true,
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });

  // D. Bộ sưu tập công khai (PUBLIC, PUBLISHED)
  const collectionId = crypto.randomUUID();
  await db.insert(collections).values({
    id: collectionId,
    profileId,
    name: 'Tài nguyên & Công cụ Công nghệ',
    slug: 'tai-nguyen-cong-nghe',
    description: 'Tập hợp các bài viết, dự án và liên kết chọn lọc dành cho lập trình viên và nhà nghiên cứu.',
    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    isFeatured: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(collectionItems).values({
    id: crypto.randomUUID(),
    collectionId,
    contentItemId: publicProjectId,
    sortOrder: 0,
    createdAt: new Date(),
  });

  await db.insert(collectionItems).values({
    id: crypto.randomUUID(),
    collectionId,
    contentItemId: resourceItemId,
    sortOrder: 1,
    createdAt: new Date(),
  });

  // E. Trang dựng khối công khai (Page with blocks)
  const pageId = crypto.randomUUID();
  await db.insert(pages).values({
    id: pageId,
    profileId,
    title: 'Triết lý Thiết kế & Tầm nhìn',
    slug: 'triet-ly-thiet-ke',
    description: 'Trang giới thiệu phong cách sống tối giản và cách thức tổ chức tri thức số.',
    coverImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    visibility: 'PUBLIC',
    status: 'PUBLISHED',
    sortOrder: 0,
    isFeatured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });

  // Các khối trên trang này
  const blocks = [
    {
      blockType: 'heading',
      sortOrder: 0,
      contentJson: { text: 'Triết lý Cá nhân trong Kỷ nguyên Số', level: 1 },
      settingsJson: { align: 'left' },
    },
    {
      blockType: 'text',
      sortOrder: 1,
      contentJson: {
        text: 'Một không gian số thực sự có ý nghĩa khi nó mang tính riêng tư tuyệt đối, tốc độ tức thì và trao toàn quyền kiểm soát vào tay chủ sở hữu.',
      },
      settingsJson: {},
    },
    {
      blockType: 'quote',
      sortOrder: 2,
      contentJson: {
        text: 'Đơn giản không phải là thiếu hụt, mà là sự chắt lọc tinh tế nhất của trật tự và sức mạnh.',
        author: 'Nguyên lý Thiết kế Web OS',
      },
      settingsJson: {},
    },
    {
      blockType: 'card',
      sortOrder: 3,
      contentJson: {
        title: 'Tự do Lưu trữ & Link-First',
        description: 'Kết nối mọi nguồn lưu trữ: Google Drive, GitHub, OneDrive mà không bị phụ thuộc vào một nhà cung cấp duy nhất.',
        linkUrl: '/resources',
        linkText: 'Xem thư viện tài nguyên →',
      },
      settingsJson: {},
    },
  ];

  for (const b of blocks) {
    await db.insert(contentBlocks).values({
      id: crypto.randomUUID(),
      pageId,
      blockType: b.blockType,
      sortOrder: b.sortOrder,
      contentJson: b.contentJson,
      settingsJson: b.settingsJson,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const seeded = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return seeded[0];
}
