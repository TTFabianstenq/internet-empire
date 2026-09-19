import { neon } from "@neondatabase/serverless";

let ready: Promise<void> | null = null;

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(url);
}

export async function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    const db = sql();
    await db`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS game_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 0,
      last_tick_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS idempotency_keys (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, key)
    )`;
    await db`CREATE INDEX IF NOT EXISTS idempotency_created_idx ON idempotency_keys (created_at)`;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}
