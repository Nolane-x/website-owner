import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let dbInstance: any = null;
let pgliteClient: PGlite | null = null;
let postgresClient: any = null;

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

  // Chế độ không cần cài đặt ngoài: PGLite (WASM Postgres 16) lưu tại thư mục data/
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

    CREATE INDEX IF NOT EXISTS idx_content_vis_status ON content_items(visibility, status);
    CREATE INDEX IF NOT EXISTS idx_content_slug ON content_items(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_vis_status ON pages(visibility, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(created_at);
  `;

  if (pgliteClient) {
    await pgliteClient.exec(ddl);
  } else if (postgresClient) {
    await postgresClient.unsafe(ddl);
  }

  return db;
}
