import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Hồ sơ người dùng (Single Owner)
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Thông tin xác thực mật khẩu (Bcrypt / Argon2 hash)
export const authCredentials = pgTable('auth_credentials', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Quản lý phiên đăng nhập (Sessions)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  isTrusted: boolean('is_trusted').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
});

// 4. Cài đặt hệ thống (Settings: Theme, Layout, Navigation, Public Access, Panic Lock...)
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  key: text('key').notNull(), // 'theme_private', 'theme_public', 'dashboard_layout', 'public_layout', 'nav_config', 'public_access'
  valueJson: jsonb('value_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Nội dung tổng hợp (Content Items: Note, Project, Article, Link, Resource, Document...)
export const contentItems = pgTable('content_items', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  type: text('type').notNull(), // 'note', 'project', 'article', 'document', 'link', 'resource', 'bookmark', 'gallery', 'code'
  description: text('description'),
  content: text('content'),
  coverImage: text('cover_image'),
  icon: text('icon'),
  visibility: text('visibility').default('PRIVATE').notNull(), // 'PRIVATE', 'PUBLIC', 'UNLISTED'
  status: text('status').default('DRAFT').notNull(), // 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  category: text('category'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  sortOrder: integer('sort_order').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  shareToken: text('share_token'), // Token cho chế độ UNLISTED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
  deletedAt: timestamp('deleted_at'),
});

// 6. Trang động (Pages)
export const pages = pgTable('pages', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  coverImage: text('cover_image'),
  visibility: text('visibility').default('PRIVATE').notNull(), // 'PRIVATE', 'PUBLIC', 'UNLISTED'
  status: text('status').default('DRAFT').notNull(), // 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  sortOrder: integer('sort_order').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  shareToken: text('share_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
  deletedAt: timestamp('deleted_at'),
});

// 7. Khối nội dung trên trang (Content Blocks cho Page Canvas Builder)
export const contentBlocks = pgTable('content_blocks', {
  id: text('id').primaryKey(),
  pageId: text('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  blockType: text('block_type').notNull(), // 'heading', 'text', 'markdown', 'image', 'gallery', 'video', 'button', 'card', 'project_card', 'resource_card', 'quote', 'code', 'divider', 'spacer', 'grid', 'columns', 'table', 'timeline', 'list', 'embed', 'collection'
  sortOrder: integer('sort_order').default(0).notNull(),
  contentJson: jsonb('content_json').$type<Record<string, unknown>>().notNull(),
  settingsJson: jsonb('settings_json').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Thư mục phân loại (Folders)
export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Bộ sưu tập (Collections)
export const collections = pgTable('collections', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  coverImage: text('cover_image'),
  icon: text('icon'),
  visibility: text('visibility').default('PRIVATE').notNull(), // 'PRIVATE', 'PUBLIC', 'UNLISTED'
  status: text('status').default('DRAFT').notNull(), // 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  isFeatured: boolean('is_featured').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  shareToken: text('share_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// 10. Liên kết phần tử trong bộ sưu tập (Collection Items)
export const collectionItems = pgTable('collection_items', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  contentItemId: text('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Két mật mã cá nhân (Client-side Encrypted Vault Items)
export const vaultItems = pgTable('vault_items', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  serviceName: text('service_name').notNull(),
  username: text('username').notNull(),
  ciphertext: text('ciphertext').notNull(), // Encrypted password & sensitive notes
  iv: text('iv').notNull(),
  salt: text('salt').notNull(),
  url: text('url'),
  category: text('category'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Nhật ký bảo mật (Security Audit Log)
export const securityEvents = pgTable('security_events', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  eventType: text('event_type').notNull(),
  detailsJson: jsonb('details_json').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Quản lý phiên khách truy cập bảo mật (Guest Sessions - tách biệt mật khẩu hash)
export const guestSessions = pgTable('guest_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// 14. Lịch sử phiên bản nội dung (Version History / Revisions)
export const contentRevisions = pgTable('content_revisions', {
  id: text('id').primaryKey(),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(), // 'content' | 'page'
  revisionNumber: integer('revision_number').notNull(),
  titleSnapshot: text('title_snapshot').notNull(),
  bodySnapshot: text('body_snapshot'),
  metadataSnapshot: jsonb('metadata_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const pagesRelations = relations(pages, ({ many }) => ({
  blocks: many(contentBlocks),
}));

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  page: one(pages, {
    fields: [contentBlocks.pageId],
    references: [pages.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  contentItem: one(contentItems, {
    fields: [collectionItems.contentItemId],
    references: [contentItems.id],
  }),
}));
