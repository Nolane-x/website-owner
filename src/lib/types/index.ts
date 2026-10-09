export type Visibility = 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ContentType =
  | 'note'
  | 'project'
  | 'article'
  | 'document'
  | 'link'
  | 'resource'
  | 'gallery'
  | 'video'
  | 'code'
  | 'bookmark'
  | 'timeline'
  | 'journal';

export type BlockType =
  | 'heading'
  | 'text'
  | 'markdown'
  | 'image'
  | 'gallery'
  | 'video'
  | 'button'
  | 'link'
  | 'card'
  | 'project_card'
  | 'document_card'
  | 'resource_card'
  | 'quote'
  | 'code'
  | 'divider'
  | 'spacer'
  | 'grid'
  | 'columns'
  | 'table'
  | 'timeline'
  | 'list'
  | 'embed'
  | 'collection';

export interface ContentItem {
  id: string;
  profileId: string;
  title: string;
  slug: string;
  type: ContentType;
  description?: string | null;
  content?: string | null;
  coverImage?: string | null;
  icon?: string | null;
  visibility: Visibility;
  status: ContentStatus;
  tags: string[];
  category?: string | null;
  metadata?: Record<string, unknown> | null;
  sortOrder: number;
  isFeatured: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface ContentBlock {
  id: string;
  pageId: string;
  blockType: BlockType;
  sortOrder: number;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PageItem {
  id: string;
  profileId: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  visibility: Visibility;
  status: ContentStatus;
  sortOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  blocks?: ContentBlock[];
}

export interface CollectionItem {
  id: string;
  profileId: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  icon?: string | null;
  visibility: Visibility;
  status: ContentStatus;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items?: ContentItem[];
}

export interface ResourceLinkItem {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  thumbnail?: string | null;
  provider?: string | null;
  category?: string | null;
  tags: string[];
  visibility: Visibility;
  downloadAllowed: boolean;
  openInNewTab: boolean;
  sortOrder: number;
  isFeatured: boolean;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  profileId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isTrusted: boolean;
  isCurrent?: boolean;
  expiresAt: string;
  createdAt: string;
  lastActiveAt: string;
  isRevoked: boolean;
}

export interface SecurityEvent {
  id: string;
  profileId: string;
  eventType: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  fontSans: string;
  fontSerif: string;
  fontMono: string;
  accentColor: string;
  radius: string;
  density: 'compact' | 'comfortable' | 'spacious';
  customTokens?: Record<string, string>;
}

export interface DashboardWidgetConfig {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  order: number;
  width?: 'full' | 'half' | 'third';
}

export interface PublicAccessConfig {
  requirePassword: boolean;
  passwordHint?: string;
  allowCopy: boolean;
  showSearch: boolean;
  customHeaderTitle?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface KanbanSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface KanbanTask {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  tags: string[];
  subtasksJson: KanbanSubtask[];
  sortOrder: number;
  relatedItemId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionCategory = 'infrastructure' | 'ai' | 'developer' | 'lifestyle';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'canceled';

export interface Subscription {
  id: string;
  profileId: string;
  name: string;
  category: SubscriptionCategory;
  cost: number;
  currency: 'VND' | 'USD';
  billingCycle: BillingCycle;
  nextBillingDate: string;
  status: SubscriptionStatus;
  url?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CodeSnippet {
  id: string;
  profileId: string;
  title: string;
  description?: string | null;
  language: string;
  code: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScratchpadColor = 'amber' | 'emerald' | 'sky' | 'rose' | 'violet' | 'stone';

export interface Scratchpad {
  id: string;
  profileId: string;
  title?: string | null;
  content: string;
  color: ScratchpadColor;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkText: string;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  title: string;
  type: string;
  slug: string;
  description?: string | null;
  connectionsCount?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}
