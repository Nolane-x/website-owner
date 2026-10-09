import { sanitizeHtml } from '../security/sanitize';

/**
 * PUBLIC SERIALIZERS
 * Rule VIII: Tuyệt đối không trả nguyên bản JSON metadata từ database ra ngoài công khai.
 * Chỉ cho phép các trường whitelist được định nghĩa rõ ràng.
 */

export function toPublicContent(item: any) {
  if (!item) return null;

  // Lọc metadata công khai, loại bỏ triệt để các trường nhạy cảm nội bộ
  const rawMeta = item.metadata || {};
  const publicMetadata: Record<string, any> = {};

  const allowedMetaKeys = ['readingTime', 'author', 'license', 'canonicalUrl', 'summary', 'toc'];
  for (const k of allowedMetaKeys) {
    if (rawMeta[k] !== undefined) {
      publicMetadata[k] = rawMeta[k];
    }
  }

  return {
    id: String(item.id),
    title: String(item.title || '').normalize('NFC'),
    slug: String(item.slug || ''),
    type: String(item.type || 'article'),
    description: item.description ? String(item.description).normalize('NFC') : null,
    content: item.content ? sanitizeHtml(String(item.content)) : null,
    coverImage: item.coverImage ? String(item.coverImage) : null,
    icon: item.icon ? String(item.icon) : null,
    category: item.category ? String(item.category).normalize('NFC') : null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    isFeatured: Boolean(item.isFeatured),
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicProject(item: any) {
  if (!item) return null;

  const rawMeta = item.metadata || {};
  const publicMetadata: Record<string, any> = {
    repoUrl: rawMeta.repoUrl ? String(rawMeta.repoUrl) : undefined,
    demoUrl: rawMeta.demoUrl ? String(rawMeta.demoUrl) : undefined,
    techStack: Array.isArray(rawMeta.techStack) ? rawMeta.techStack : undefined,
    status: rawMeta.status ? String(rawMeta.status) : undefined,
    year: rawMeta.year ? String(rawMeta.year) : undefined,
  };

  return {
    id: String(item.id),
    title: String(item.title || '').normalize('NFC'),
    slug: String(item.slug || ''),
    description: item.description ? String(item.description).normalize('NFC') : null,
    content: item.content ? sanitizeHtml(String(item.content)) : null,
    coverImage: item.coverImage ? String(item.coverImage) : null,
    icon: item.icon ? String(item.icon) : null,
    category: item.category ? String(item.category).normalize('NFC') : 'Engineering',
    tags: Array.isArray(item.tags) ? item.tags : [],
    isFeatured: Boolean(item.isFeatured),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicResource(item: any) {
  if (!item) return null;

  const rawMeta = item.metadata || {};
  const publicMetadata: Record<string, any> = {
    url: rawMeta.url ? String(rawMeta.url) : '#',
    provider: rawMeta.provider ? String(rawMeta.provider) : 'Web',
    downloadAllowed: Boolean(rawMeta.downloadAllowed),
    openInNewTab: rawMeta.openInNewTab !== false,
  };

  return {
    id: String(item.id),
    title: String(item.title || '').normalize('NFC'),
    slug: String(item.slug || ''),
    type: 'resource',
    description: item.description ? String(item.description).normalize('NFC') : null,
    category: item.category ? String(item.category).normalize('NFC') : 'Resource',
    tags: Array.isArray(item.tags) ? item.tags : [],
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicBlock(block: any) {
  if (!block) return null;

  const allowedTypes = [
    'heading', 'text', 'markdown', 'rich_text', 'image', 'gallery', 'video',
    'button', 'link', 'card', 'project_card', 'article_card', 'resource_card',
    'collection', 'quote', 'code', 'divider', 'spacer', 'grid', 'columns',
    'table', 'timeline', 'list', 'stats', 'embed', 'social_links', 'hero', 'callout'
  ];

  const blockType = allowedTypes.includes(block.blockType) ? block.blockType : 'text';
  const content = block.contentJson || {};
  const settings = block.settingsJson || {};

  // Xử lý text/markdown an toàn
  const sanitizedContent = { ...content };
  if (typeof sanitizedContent.text === 'string') {
    sanitizedContent.text = sanitizeHtml(sanitizedContent.text);
  }
  if (typeof sanitizedContent.markdown === 'string') {
    sanitizedContent.markdown = sanitizeHtml(sanitizedContent.markdown);
  }

  return {
    id: String(block.id),
    blockType,
    sortOrder: typeof block.sortOrder === 'number' ? block.sortOrder : 0,
    contentJson: sanitizedContent,
    settingsJson: settings,
  };
}

export function toPublicPage(page: any, blocks: any[] = []) {
  if (!page) return null;

  return {
    id: String(page.id),
    title: String(page.title || '').normalize('NFC'),
    slug: String(page.slug || ''),
    description: page.description ? String(page.description).normalize('NFC') : null,
    coverImage: page.coverImage ? String(page.coverImage) : null,
    isFeatured: Boolean(page.isFeatured),
    publishedAt: page.publishedAt ? new Date(page.publishedAt).toISOString() : null,
    blocks: blocks.map(toPublicBlock).filter(Boolean),
  };
}

export function toPublicCollection(col: any, items: any[] = []) {
  if (!col) return null;

  return {
    id: String(col.id),
    name: String(col.name || '').normalize('NFC'),
    slug: String(col.slug || ''),
    description: col.description ? String(col.description).normalize('NFC') : null,
    coverImage: col.coverImage ? String(col.coverImage) : null,
    icon: col.icon ? String(col.icon) : null,
    isFeatured: Boolean(col.isFeatured),
    items: items.map(toPublicContent).filter(Boolean),
  };
}

export function toPublicSiteSettings(settingsMap: Record<string, any>) {
  const publicTheme = settingsMap['theme_public'] || {
    mode: 'light',
    fontSans: 'Be Vietnam Pro',
    fontSerif: 'Newsreader',
    fontMono: 'JetBrains Mono',
    accentColor: '#BA4311',
    radius: '0.625rem',
    density: 'comfortable',
    customHeaderTitle: 'Chủ Sở Hữu',
  };

  const publicNav = settingsMap['public_navigation'] || settingsMap['nav_config'] || {
    items: [
      { id: 'pub-home', label: 'Trang chủ', href: '/', visible: true },
      { id: 'pub-about', label: 'Giới thiệu', href: '/about', visible: true },
      { id: 'pub-projects', label: 'Dự án', href: '/projects', visible: true },
      { id: 'pub-articles', label: 'Bài viết', href: '/articles', visible: true },
      { id: 'pub-resources', label: 'Tài nguyên', href: '/resources', visible: true },
      { id: 'pub-collections', label: 'Bộ sưu tập', href: '/collections', visible: true },
    ],
  };

  const publicAccess = settingsMap['public_access'] || {
    requirePassword: false,
    passwordHint: '',
    allowCopy: true,
    showSearch: true,
    customHeaderTitle: 'Personal Web OS',
  };

  return {
    theme: publicTheme,
    navigation: publicNav,
    accessProtection: {
      requirePassword: Boolean(publicAccess.requirePassword),
      passwordHint: publicAccess.passwordHint ? String(publicAccess.passwordHint) : '',
      allowCopy: publicAccess.allowCopy !== false,
      showSearch: publicAccess.showSearch !== false,
    },
  };
}
