import { sanitizeHtml } from '../security/sanitize';

const PUBLIC_URL_FIELD_NAMES = new Set([
  'url', 'href', 'src', 'link', 'repourl', 'demourl', 'canonicalurl',
  'coverimage', 'image', 'imageurl', 'backgroundimage', 'thumbnail',
  'thumbnailurl', 'poster', 'iconurl', 'avatarurl', 'videourl',
  'sourceurl', 'fileurl', 'downloadurl',
]);
const DATA_IMAGE_FIELD_NAMES = new Set([
  'src', 'coverimage', 'image', 'imageurl', 'backgroundimage',
  'thumbnail', 'thumbnailurl', 'poster', 'iconurl', 'avatarurl',
]);

function safePublicUrl(
  value: unknown,
  allowMailtoTel = false,
  allowRasterDataImage = false,
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim();
  const maxLength = allowRasterDataImage ? 512 * 1024 : 4_096;
  if (
    !candidate ||
    candidate.length > maxLength ||
    /[\u0000-\u001F\u007F]/.test(candidate) ||
    candidate.includes('\\') ||
    candidate.startsWith('//')
  ) return undefined;

  if (/^data:/i.test(candidate)) {
    if (
      allowRasterDataImage &&
      /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(candidate)
    ) return candidate;
    return undefined;
  }

  const hasExplicitScheme = /^[a-z][a-z\d+.-]*:/i.test(candidate);
  let parsed: URL;
  try {
    parsed = hasExplicitScheme
      ? new URL(candidate)
      : new URL(candidate, 'https://public.invalid');
  } catch {
    return undefined;
  }
  if (parsed.username || parsed.password) return undefined;

  if (!hasExplicitScheme) {
    return parsed.origin === 'https://public.invalid' ? candidate : undefined;
  }
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return candidate;
  if (allowMailtoTel && (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:')) return candidate;
  return undefined;
}

/** Recursively protect URL-bearing public block fields, including nested cards and gallery items. */
function sanitizePublicUrlFields(value: unknown, fieldName?: string): unknown {
  if (typeof value === 'string') {
    const key = fieldName?.toLowerCase();
    if (!key || (!PUBLIC_URL_FIELD_NAMES.has(key) && !key.endsWith('url'))) return value;
    return safePublicUrl(
      value,
      key === 'href' || key === 'url' || key === 'link',
      DATA_IMAGE_FIELD_NAMES.has(key),
    ) ?? '';
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicUrlFields(item));
  }
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      sanitizePublicUrlFields(nested, key),
    ]),
  );
}

/**
 * PUBLIC SERIALIZERS & DTOs
 * Rule VIII: Tuyệt đối không trả nguyên bản JSON metadata từ database ra ngoài công khai.
 * Chỉ cho phép các trường whitelist được định nghĩa rõ ràng.
 */

export interface PublicContentDTO {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string | null;
  content: string | null;
  coverImage: string | null;
  icon: string | null;
  category: string | null;
  tags: string[];
  sortOrder: number;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
}

export interface PublicProjectDTO {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  coverImage: string | null;
  icon: string | null;
  category: string;
  tags: string[];
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string | null;
  metadata: {
    repoUrl?: string;
    demoUrl?: string;
    techStack?: string[];
    status?: string;
    year?: string;
  };
}

export interface PublicResourceDTO {
  id: string;
  title: string;
  slug: string;
  type: 'resource';
  description: string | null;
  category: string;
  tags: string[];
  publishedAt: string | null;
  metadata: {
    url: string;
    provider: string;
    downloadAllowed: boolean;
    openInNewTab: boolean;
  };
}

export interface PublicBlockDTO {
  id: string;
  blockType: string;
  sortOrder: number;
  contentJson: Record<string, unknown>;
  settingsJson: Record<string, unknown>;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface PublicPageDTO {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  blocks: PublicBlockDTO[];
}

export interface PublicCollectionDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  icon: string | null;
  isFeatured: boolean;
  items: PublicContentDTO[];
}

export interface PublicNavigationItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

export interface PublicSiteSettingsDTO {
  theme: Record<string, unknown>;
  navigation: {
    items: PublicNavigationItem[];
  };
  accessProtection: {
    requirePassword: boolean;
    passwordHint: string;
    allowCopy: boolean;
    showSearch: boolean;
  };
}

export function toPublicContent(item: Record<string, unknown> | null | undefined): PublicContentDTO | null {
  if (!item) return null;

  const rawMeta = (typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {}) as Record<string, unknown>;
  const publicMetadata: Record<string, unknown> = {};

  const allowedMetaKeys = ['readingTime', 'author', 'license', 'canonicalUrl', 'summary', 'toc'];
  for (const k of allowedMetaKeys) {
    if (rawMeta[k] === undefined) continue;
    const safeValue = sanitizePublicUrlFields(rawMeta[k], k);
    if (k === 'canonicalUrl') {
      const canonicalUrl = safePublicUrl(safeValue);
      if (canonicalUrl) publicMetadata[k] = canonicalUrl;
    } else {
      publicMetadata[k] = safeValue;
    }
  }

  return {
    id: String(item.id),
    title: String(item.title || '').normalize('NFC'),
    slug: String(item.slug || ''),
    type: String(item.type || 'article'),
    description: item.description ? String(item.description).normalize('NFC') : null,
    content: item.content ? sanitizeHtml(String(item.content)) : null,
    coverImage: safePublicUrl(item.coverImage, false, true) ?? null,
    icon: item.icon ? String(item.icon) : null,
    category: item.category ? String(item.category).normalize('NFC') : null,
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    isFeatured: Boolean(item.isFeatured),
    publishedAt: item.publishedAt ? new Date(item.publishedAt as string | Date).toISOString() : null,
    createdAt: item.createdAt ? new Date(item.createdAt as string | Date).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicProject(item: Record<string, unknown> | null | undefined): PublicProjectDTO | null {
  if (!item) return null;

  const rawMeta = (typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {}) as Record<string, unknown>;
  const publicMetadata: PublicProjectDTO['metadata'] = {
    repoUrl: safePublicUrl(rawMeta.repoUrl),
    demoUrl: safePublicUrl(rawMeta.demoUrl),
    techStack: Array.isArray(rawMeta.techStack) ? (rawMeta.techStack as string[]) : undefined,
    status: rawMeta.status ? String(rawMeta.status) : undefined,
    year: rawMeta.year ? String(rawMeta.year) : undefined,
  };

  return {
    id: String(item.id),
    title: String(item.title || '').normalize('NFC'),
    slug: String(item.slug || ''),
    description: item.description ? String(item.description).normalize('NFC') : null,
    content: item.content ? sanitizeHtml(String(item.content)) : null,
    coverImage: safePublicUrl(item.coverImage, false, true) ?? null,
    icon: item.icon ? String(item.icon) : null,
    category: item.category ? String(item.category).normalize('NFC') : 'Engineering',
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    isFeatured: Boolean(item.isFeatured),
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
    publishedAt: item.publishedAt ? new Date(item.publishedAt as string | Date).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicResource(item: Record<string, unknown> | null | undefined): PublicResourceDTO | null {
  if (!item) return null;

  const rawMeta = (typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {}) as Record<string, unknown>;
  const publicMetadata: PublicResourceDTO['metadata'] = {
    url: safePublicUrl(rawMeta.url, true) ?? '#',
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
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    publishedAt: item.publishedAt ? new Date(item.publishedAt as string | Date).toISOString() : null,
    metadata: publicMetadata,
  };
}

export function toPublicBlock(block: Record<string, unknown> | null | undefined): PublicBlockDTO | null {
  if (!block) return null;

  const allowedTypes = [
    'heading', 'text', 'markdown', 'rich_text', 'image', 'gallery', 'video',
    'button', 'link', 'card', 'project_card', 'article_card', 'resource_card',
    'collection', 'quote', 'code', 'divider', 'spacer', 'grid', 'columns',
    'table', 'timeline', 'list', 'stats', 'embed', 'social_links', 'hero', 'callout'
  ];

  const blockType = typeof block.blockType === 'string' && allowedTypes.includes(block.blockType)
    ? block.blockType
    : 'text';
  const content = (typeof block.contentJson === 'object' && block.contentJson !== null ? block.contentJson : {}) as Record<string, unknown>;
  const settings = (typeof block.settingsJson === 'object' && block.settingsJson !== null ? block.settingsJson : {}) as Record<string, unknown>;

  // Xử lý text/markdown/html an toàn
  const sanitizedContent = sanitizePublicUrlFields(content) as Record<string, unknown>;
  const sanitizedSettings = sanitizePublicUrlFields(settings) as Record<string, unknown>;
  if (typeof sanitizedContent.text === 'string') {
    sanitizedContent.text = sanitizeHtml(sanitizedContent.text);
  }
  if (typeof sanitizedContent.markdown === 'string') {
    sanitizedContent.markdown = sanitizeHtml(sanitizedContent.markdown);
  }
  if (typeof sanitizedContent.html === 'string') {
    sanitizedContent.html = sanitizeHtml(sanitizedContent.html);
  }
  if (typeof sanitizedContent.caption === 'string') {
    sanitizedContent.caption = sanitizeHtml(sanitizedContent.caption);
  }
  if (typeof sanitizedContent.title === 'string') {
    sanitizedContent.title = sanitizeHtml(sanitizedContent.title);
  }

  // Khử các URL scheme độc hại như javascript: hoặc data:text/html
  for (const urlKey of ['url', 'href', 'src', 'link']) {
    if (typeof sanitizedContent[urlKey] === 'string') {
      const trimmed = (sanitizedContent[urlKey] as string).trim().toLowerCase();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:text/html') ||
        trimmed.startsWith('vbscript:')
      ) {
        sanitizedContent[urlKey] = '';
      }
    }
  }

  return {
    id: String(block.id),
    blockType,
    sortOrder: typeof block.sortOrder === 'number' ? block.sortOrder : 0,
    contentJson: sanitizedContent,
    settingsJson: sanitizedSettings,
    content: sanitizedContent,
    settings: sanitizedSettings,
  };
}

export function toPublicPage(
  page: Record<string, unknown> | null | undefined,
  blocks: Array<Record<string, unknown>> = []
): PublicPageDTO | null {
  if (!page) return null;

  const publicBlocks: PublicBlockDTO[] = [];
  for (const b of blocks) {
    const pubBlock = toPublicBlock(b);
    if (pubBlock) publicBlocks.push(pubBlock);
  }

  return {
    id: String(page.id),
    title: String(page.title || '').normalize('NFC'),
    slug: String(page.slug || ''),
    description: page.description ? String(page.description).normalize('NFC') : null,
    coverImage: safePublicUrl(page.coverImage, false, true) ?? null,
    isFeatured: Boolean(page.isFeatured),
    publishedAt: page.publishedAt ? new Date(page.publishedAt as string | Date).toISOString() : null,
    blocks: publicBlocks,
  };
}

export function toPublicCollection(
  col: Record<string, unknown> | null | undefined,
  items: Array<Record<string, unknown>> = []
): PublicCollectionDTO | null {
  if (!col) return null;

  const publicItems: PublicContentDTO[] = [];
  for (const it of items) {
    const pubItem = toPublicContent(it);
    if (pubItem) publicItems.push(pubItem);
  }

  return {
    id: String(col.id),
    name: String(col.name || '').normalize('NFC'),
    slug: String(col.slug || ''),
    description: col.description ? String(col.description).normalize('NFC') : null,
    coverImage: safePublicUrl(col.coverImage, false, true) ?? null,
    icon: col.icon ? String(col.icon) : null,
    isFeatured: Boolean(col.isFeatured),
    items: publicItems,
  };
}

export function toPublicSiteSettings(settingsMap: Record<string, unknown>): PublicSiteSettingsDTO {
  const publicTheme = (typeof settingsMap['theme_public'] === 'object' && settingsMap['theme_public'] !== null
    ? settingsMap['theme_public']
    : {
        mode: 'light',
        fontSans: 'Be Vietnam Pro',
        fontSerif: 'Newsreader',
        fontMono: 'JetBrains Mono',
        accentColor: '#BA4311',
        radius: '0.625rem',
        density: 'comfortable',
        customHeaderTitle: 'Chủ Sở Hữu',
      }) as Record<string, unknown>;

  // P1.1: Tuyệt đối không fallback sang nav_config hoặc menu quản trị
  const defaultPublicNavItems: PublicNavigationItem[] = [
    { id: 'pub-home', label: 'Trang chủ', href: '/', visible: true },
    { id: 'pub-about', label: 'Giới thiệu', href: '/about', visible: true },
    { id: 'pub-projects', label: 'Dự án', href: '/projects', visible: true },
    { id: 'pub-articles', label: 'Bài viết', href: '/articles', visible: true },
    { id: 'pub-resources', label: 'Tài nguyên', href: '/resources', visible: true },
    { id: 'pub-collections', label: 'Bộ sưu tập', href: '/collections', visible: true },
  ];

  let publicNavItems = defaultPublicNavItems;
  const rawPublicNav = settingsMap['public_navigation'];
  if (typeof rawPublicNav === 'object' && rawPublicNav !== null && Array.isArray((rawPublicNav as { items?: unknown }).items)) {
    const normalizedItems = ((rawPublicNav as { items: unknown[] }).items).flatMap((value): PublicNavigationItem[] => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const item = value as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id.trim().slice(0, 100) : '';
      const label = typeof item.label === 'string' ? item.label.normalize('NFC').trim().slice(0, 80) : '';
      const href = safePublicUrl(item.href, true);
      if (!id || !label || !href) return [];
      return [{ id, label, href, visible: typeof item.visible === 'boolean' ? item.visible : true }];
    });
    if (normalizedItems.length > 0) publicNavItems = normalizedItems;
  }

  const rawPublicAccess = (typeof settingsMap['public_access'] === 'object' && settingsMap['public_access'] !== null
    ? settingsMap['public_access']
    : {}) as Record<string, unknown>;

  return {
    theme: publicTheme,
    navigation: {
      items: publicNavItems,
    },
    accessProtection: {
      requirePassword: Boolean(rawPublicAccess.requirePassword),
      passwordHint: rawPublicAccess.passwordHint ? String(rawPublicAccess.passwordHint) : '',
      allowCopy: rawPublicAccess.allowCopy !== false,
      showSearch: rawPublicAccess.showSearch !== false,
    },
  };
}
