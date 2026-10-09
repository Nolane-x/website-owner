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

// 5.0 Types
export type InboxItemKind = 'text' | 'url' | 'task' | 'snippet' | 'file';
export type InboxItemStatus = 'inbox' | 'converted' | 'archived';

export interface InboxItem {
  id: string;
  profileId: string;
  title: string;
  kind: InboxItemKind;
  textPreview?: string | null;
  sourceUri?: string | null;
  status: InboxItemStatus;
  tagsJson: string[];
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WallpaperMediaType = 'image' | 'video' | 'shader';

export interface WallpaperFilters {
  dim?: number;
  blur?: number;
  contrast?: number;
  saturation?: number;
  vignette?: boolean;
  scanlines?: boolean;
}

export interface CustomWallpaper {
  id: string;
  profileId: string;
  title: string;
  sourceUrl?: string | null;
  localDataUrl?: string | null;
  type: WallpaperMediaType;
  tagsJson: string[];
  filtersJson: WallpaperFilters;
  isFavorite: boolean;
  createdAt: string;
}

export type ResearchSourceStatus = 'captured' | 'read' | 'annotated';

export interface ResearchSource {
  id: string;
  profileId: string;
  title: string;
  url?: string | null;
  author?: string | null;
  excerpt?: string | null;
  status: ResearchSourceStatus;
  tagsJson: string[];
  createdAt: string;
}

export type ClaimStatus = 'unreviewed' | 'supported' | 'disputed' | 'refuted';

export interface Claim {
  id: string;
  profileId: string;
  statement: string;
  status: ClaimStatus;
  sourceIdsJson: string[];
  notes?: string | null;
  createdAt: string;
}

export type DecisionStatus = 'proposed' | 'accepted' | 'rejected';

export interface DecisionRecord {
  id: string;
  profileId: string;
  projectId?: string | null;
  title: string;
  context: string;
  decision: string;
  consequences?: string | null;
  status: DecisionStatus;
  createdAt: string;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon?: string;
  isMinimized: boolean;
  isMaximized: boolean;
  isPinned: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  prevBounds?: WindowBounds;
}

// 5.0 Extended Domain Types

export interface ProjectGoal {
  id: string;
  profileId: string;
  title: string;
  description?: string;
  category: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface ProjectHealth {
  score: number;
  overdueCount: number;
  blockedCount: number;
  velocity: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'ai' | 'approval';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDefinition {
  id: string;
  profileId: string;
  name: string;
  description?: string;
  triggerType: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ContentPipelineStage = 'idea' | 'brief' | 'research' | 'draft' | 'review' | 'approved' | 'published';

export interface ContentPipelineItem {
  id: string;
  title: string;
  stage: ContentPipelineStage;
  channel: string;
  body: string;
  outline?: string;
  tags: string[];
  scheduledAt?: string;
  updatedAt: string;
}

export interface LearningCard {
  id: string;
  deckName: string;
  front: string;
  back: string;
  difficulty: number;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: string;
}

export interface CrmContact {
  id: string;
  name: string;
  role: string;
  organization?: string;
  category: 'colleague' | 'mentor' | 'client' | 'partner' | 'other';
  email?: string;
  phone?: string;
  lastInteractionAt?: string;
  followUpDays: number;
  notes?: string;
  neverCloudAi: boolean;
}

