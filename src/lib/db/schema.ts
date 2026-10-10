import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { WorkflowNode, WorkflowEdge } from '@/lib/types';
export type { WorkflowNode, WorkflowEdge };

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
}, (table) => [
  uniqueIndex('idx_settings_profile_key').on(table.profileId, table.key),
]);

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

// 15. Quản lý công việc Kanban (Personal Task Board)
export const kanbanTasks = pgTable('kanban_tasks', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'), // 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: text('priority').notNull().default('medium'), // 'urgent' | 'high' | 'medium' | 'low'
  dueDate: text('due_date'),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  subtasksJson: jsonb('subtasks_json').$type<Array<{ id: string; title: string; completed: boolean }>>().default([]).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  relatedItemId: text('related_item_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. Quản lý chi phí & dịch vụ định kỳ (Subscriptions & Tech Stack)
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull().default('infrastructure'), // 'infrastructure' | 'ai' | 'developer' | 'lifestyle'
  cost: integer('cost').notNull().default(0),
  currency: text('currency').notNull().default('VND'), // 'VND' | 'USD'
  billingCycle: text('billing_cycle').notNull().default('monthly'), // 'monthly' | 'yearly'
  nextBillingDate: text('next_billing_date').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'paused' | 'canceled'
  url: text('url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. Kho lưu trữ đoạn mã lập trình viên (Code Snippets Vault)
export const codeSnippets = pgTable('code_snippets', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  language: text('language').notNull().default('typescript'),
  code: text('code').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 18. Ghi chú nháp tức thì (Quick Scratchpad / Sticky Notes)
export const scratchpads = pgTable('scratchpads', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title'),
  content: text('content').notNull(),
  color: text('color').notNull().default('amber'), // 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'stone'
  isPinned: boolean('is_pinned').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 19. Đồ thị liên kết hai chiều (Bi-directional Wiki-links)
export const contentLinks = pgTable('content_links', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),
  linkText: text('link_text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. Hộp thư Thu thập Toàn năng (Universal Capture Inbox)
export const inboxItems = pgTable('inbox_items', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  kind: text('kind').notNull().default('text'), // 'text' | 'url' | 'task' | 'snippet' | 'file'
  textPreview: text('text_preview'),
  sourceUri: text('source_uri'),
  status: text('status').notNull().default('inbox'), // 'inbox' | 'converted' | 'archived'
  tagsJson: jsonb('tags_json').$type<string[]>().default([]).notNull(),
  projectId: text('project_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 21. Kho Hình nền Tùy chỉnh & Video Động (Custom Wallpaper Studio)
export const customWallpapers = pgTable('custom_wallpapers', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sourceUrl: text('source_url'),
  localDataUrl: text('local_data_url'),
  type: text('type').notNull().default('image'), // 'image' | 'video' | 'shader'
  tagsJson: jsonb('tags_json').$type<string[]>().default([]).notNull(),
  filtersJson: jsonb('filters_json').$type<{
    dim?: number;
    blur?: number;
    contrast?: number;
    saturation?: number;
    vignette?: boolean;
    scanlines?: boolean;
  }>().default({}).notNull(),
  isFavorite: boolean('is_favorite').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 22. Kho Nguồn Nghiên cứu (Research Source Library)
export const researchSources = pgTable('research_sources', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url'),
  author: text('author'),
  excerpt: text('excerpt'),
  status: text('status').notNull().default('captured'), // 'captured' | 'read' | 'annotated'
  tagsJson: jsonb('tags_json').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 23. Bảng Mệnh đề & Bằng chứng (Claims & Evidence Board)
export const claims = pgTable('claims', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  statement: text('statement').notNull(),
  status: text('status').notNull().default('unreviewed'), // 'unreviewed' | 'supported' | 'disputed' | 'refuted'
  sourceIdsJson: jsonb('source_ids_json').$type<string[]>().default([]).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 24. Nhật ký Quyết định Dự án (Decision Log / RFC)
export const decisionRecords = pgTable('decision_records', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  projectId: text('project_id'),
  title: text('title').notNull(),
  context: text('context').notNull(),
  decision: text('decision').notNull(),
  consequences: text('consequences'),
  status: text('status').notNull().default('proposed'), // 'proposed' | 'accepted' | 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 25. Mục tiêu Dự án & Chỉ số Tiến độ (Project Goals & Milestones)
export const projectGoals = pgTable('project_goals', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().default('delivery'), // 'delivery' | 'growth' | 'learning' | 'system'
  targetDate: text('target_date').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'completed' | 'paused'
  progress: integer('progress').notNull().default(0), // 0 - 100
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 26. Quy trình Tự động hóa & Node Canvas (Automation Workflows)
export const automationWorkflows = pgTable('automation_workflows', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  triggerType: text('trigger_type').notNull().default('manual'), // 'manual' | 'schedule' | 'inbox' | 'task_deadline'
  nodesJson: jsonb('nodes_json').$type<WorkflowNode[]>().default([]).notNull(),
  edgesJson: jsonb('edges_json').$type<WorkflowEdge[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const automationWorkflowRuns = pgTable('automation_workflow_runs', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  workflowId: text('workflow_id').notNull().references(() => automationWorkflows.id, { onDelete: 'cascade' }),
  triggerType: text('trigger_type').notNull(),
  status: text('status').notNull().default('running'),
  inputJson: jsonb('input_json').$type<Record<string, unknown>>().default({}).notNull(),
  resultJson: jsonb('result_json').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_automation_workflow_runs_profile_created').on(table.profileId, table.createdAt),
  index('idx_automation_workflow_runs_workflow_created').on(table.workflowId, table.createdAt),
]);

// 27. Chuỗi Sản xuất Nội dung (Creator Content Pipeline)
export const contentPipelines = pgTable('content_pipelines', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  stage: text('stage').notNull().default('idea'), // 'idea' | 'brief' | 'research' | 'draft' | 'review' | 'approved' | 'published'
  channel: text('channel').notNull().default('blog'), // 'blog' | 'video' | 'social' | 'newsletter'
  body: text('body').notNull().default(''),
  outline: text('outline'),
  tagsJson: jsonb('tags_json').$type<string[]>().default([]).notNull(),
  scheduledAt: text('scheduled_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 28. Thẻ Ôn tập Lặp lại Ngắt quãng (Spaced Repetition Learning Cards)
export const learningCards = pgTable('learning_cards', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  deckName: text('deck_name').notNull().default('default'),
  front: text('front').notNull(),
  back: text('back').notNull(),
  difficulty: integer('difficulty').notNull().default(1),
  intervalDays: integer('interval_days').notNull().default(1),
  repetitions: integer('repetitions').notNull().default(0),
  easeFactor: integer('ease_factor').notNull().default(250), // 2.5 * 100
  nextReviewDate: text('next_review_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 29. Danh bạ Cá nhân & Quan hệ (Personal CRM Contacts)
export const crmContacts = pgTable('crm_contacts', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  organization: text('organization'),
  category: text('category').notNull().default('colleague'), // 'colleague' | 'mentor' | 'client' | 'partner' | 'other'
  email: text('email'),
  phone: text('phone'),
  lastInteractionAt: text('last_interaction_at'),
  followUpDays: integer('follow_up_days').notNull().default(14),
  notes: text('notes'),
  neverCloudAi: boolean('never_cloud_ai').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 30. Habit tracker thực sự: completion lưu theo ngày local (YYYY-MM-DD).
export const habits = pgTable('habits', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  target: text('target').notNull().default('Hàng ngày'),
  completedDatesJson: jsonb('completed_dates_json').$type<string[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 31. Lịch nội bộ với timezone tường minh, không giả vờ là calendar sync bên ngoài.
export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  timezone: text('timezone').notNull().default('Asia/Ho_Chi_Minh'),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
