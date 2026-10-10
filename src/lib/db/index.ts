import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

export type AppDatabase = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let dbInstance: AppDatabase | null = null;
let pgliteClient: PGlite | null = null;
let postgresClient: ReturnType<typeof postgres> | null = null;

// Khởi tạo Database Client linh hoạt: Postgres hoặc PGLite Embedded
export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== '') {
    // Kết nối PostgreSQL thật (Supabase, Neon, AWS RDS, Localhost...)
    postgresClient = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    dbInstance = drizzle(postgresClient, { schema });
    return dbInstance;
  }

  // RULE XXXVI: Production yêu cầu DATABASE_URL. Không âm thầm chuyển sang PGlite.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production yêu cầu DATABASE_URL.');
  }

  // Chế độ phát triển & test: PGLite (WASM Postgres 16) lưu tại thư mục data/
  const dataDir = process.env.NODE_ENV === 'test'
    ? undefined // In-memory cho unit tests
    : path.join(process.cwd(), 'data', 'webos_pglite');

  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgliteClient = dataDir ? new PGlite(dataDir) : new PGlite();
  dbInstance = drizzlePglite(pgliteClient, { schema });
  return dbInstance;
}

// Hàm khởi tạo bảng và seed dữ liệu ban đầu
export async function initializeDatabase() {
  const db = getDb();

  // Tạo các bảng trực tiếp nếu chưa tồn tại (tương thích tuyệt đối cả Postgres và PGLite)
  const ddl = `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_credentials (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      ip_address TEXT,
      user_agent TEXT,
      is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_revoked BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value_json JSONB NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      content TEXT,
      cover_image TEXT,
      icon TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      category TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      share_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      published_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      cover_image TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      share_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      published_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      block_type TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      cover_image TEXT,
      icon TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      share_token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      id TEXT PRIMARY KEY,
      collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      content_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      username TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      salt TEXT NOT NULL,
      url TEXT,
      category TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details_json JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guest_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS content_revisions (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      title_snapshot TEXT NOT NULL,
      body_snapshot TEXT,
      metadata_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE content_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
    ALTER TABLE collections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

    CREATE TABLE IF NOT EXISTS kanban_tasks (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      subtasks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      sort_order INTEGER NOT NULL DEFAULT 0,
      related_item_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'infrastructure',
      cost INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'VND',
      billing_cycle TEXT NOT NULL DEFAULT 'monthly',
      next_billing_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      url TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS code_snippets (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      language TEXT NOT NULL DEFAULT 'typescript',
      code TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scratchpads (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT,
      content TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'amber',
      is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS content_links (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      link_text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inbox_items (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',
      text_preview TEXT,
      source_uri TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      project_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS custom_wallpapers (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      source_url TEXT,
      local_data_url TEXT,
      type TEXT NOT NULL DEFAULT 'image',
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS research_sources (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT,
      author TEXT,
      excerpt TEXT,
      status TEXT NOT NULL DEFAULT 'captured',
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      statement TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unreviewed',
      source_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS decision_records (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      project_id TEXT,
      title TEXT NOT NULL,
      context TEXT NOT NULL,
      decision TEXT NOT NULL,
      consequences TEXT,
      status TEXT NOT NULL DEFAULT 'proposed',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_goals (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'delivery',
      target_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS automation_workflows (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      nodes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      edges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      last_scheduled_for TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    -- Idempotent additive migration for databases created before daily workflow scheduling.
    ALTER TABLE automation_workflows ADD COLUMN IF NOT EXISTS schedule_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE automation_workflows ADD COLUMN IF NOT EXISTS last_scheduled_for TEXT;
    CREATE INDEX IF NOT EXISTS idx_automation_workflows_scheduler
      ON automation_workflows(is_active, schedule_enabled, trigger_type);

    CREATE TABLE IF NOT EXISTS automation_workflow_runs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      workflow_id TEXT NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      result_json JSONB,
      error_message TEXT,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      duration_ms INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_automation_workflow_runs_profile_created
      ON automation_workflow_runs(profile_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_automation_workflow_runs_workflow_created
      ON automation_workflow_runs(workflow_id, created_at);

    CREATE TABLE IF NOT EXISTS content_pipelines (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'idea',
      channel TEXT NOT NULL DEFAULT 'blog',
      body TEXT NOT NULL DEFAULT '',
      outline TEXT,
      tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      scheduled_at TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS learning_cards (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      deck_name TEXT NOT NULL DEFAULT 'default',
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      difficulty INTEGER NOT NULL DEFAULT 1,
      interval_days INTEGER NOT NULL DEFAULT 1,
      repetitions INTEGER NOT NULL DEFAULT 0,
      ease_factor INTEGER NOT NULL DEFAULT 250,
      next_review_date TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      organization TEXT,
      category TEXT NOT NULL DEFAULT 'colleague',
      email TEXT,
      phone TEXT,
      last_interaction_at TEXT,
      follow_up_days INTEGER NOT NULL DEFAULT 14,
      notes TEXT,
      never_cloud_ai BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target TEXT NOT NULL DEFAULT 'Hàng ngày',
      completed_dates_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
      is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_habits_profile_active ON habits(profile_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_profile_start ON calendar_events(profile_id, start_at);

    CREATE INDEX IF NOT EXISTS idx_content_vis_status ON content_items(visibility, status);
    CREATE INDEX IF NOT EXISTS idx_content_slug ON content_items(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_vis_status ON pages(visibility, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON guest_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_content_revisions_target ON content_revisions(target_id, revision_number);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_profile_key ON settings(profile_id, key);
    CREATE INDEX IF NOT EXISTS idx_kanban_status ON kanban_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_scratchpads_pinned ON scratchpads(is_pinned, sort_order);
    CREATE INDEX IF NOT EXISTS idx_content_links_target ON content_links(target_id);
    CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_items(status);
    CREATE INDEX IF NOT EXISTS idx_wallpapers_fav ON custom_wallpapers(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
  `;

  if (pgliteClient) {
    await pgliteClient.exec(ddl);
  } else if (postgresClient) {
    await postgresClient.unsafe(ddl);
  }

  // One-time migration: preserve legacy duplicate tasks, but remove their duplicate
  // source links before installing a partial unique index for race-safe Inbox conversion.
  const sourceLinkIndexName = 'idx_kanban_tasks_profile_related_item_unique';
  let sourceLinkIndexExists = false;
  const indexCheckSql = `SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = $1
  ) AS exists`;

  if (pgliteClient) {
    const indexResult = await pgliteClient.query<{ exists: boolean }>(indexCheckSql, [sourceLinkIndexName]);
    sourceLinkIndexExists = indexResult.rows[0]?.exists === true;
  } else if (postgresClient) {
    const indexResult = await postgresClient.unsafe<{ exists: boolean }[]>(indexCheckSql, [sourceLinkIndexName]);
    sourceLinkIndexExists = indexResult[0]?.exists === true;
  }

  if (!sourceLinkIndexExists) {
    const sourceLinkMigration = `
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY profile_id, related_item_id
            ORDER BY created_at ASC, id ASC
          ) AS row_number
        FROM kanban_tasks
        WHERE related_item_id IS NOT NULL
      )
      UPDATE kanban_tasks
      SET related_item_id = NULL
      WHERE id IN (SELECT id FROM ranked WHERE row_number > 1);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_kanban_tasks_profile_related_item_unique
        ON kanban_tasks(profile_id, related_item_id)
        WHERE related_item_id IS NOT NULL;
    `;
    if (pgliteClient) await pgliteClient.exec(sourceLinkMigration);
    else if (postgresClient) await postgresClient.unsafe(sourceLinkMigration);
  }

  return db;
}
