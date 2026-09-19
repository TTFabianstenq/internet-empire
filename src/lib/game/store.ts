import { ensureSchema, sql } from "../db";
import { validIdempotency } from "../security/ids";
import { applyElapsed, defaultState, grantAchievements, publicView, sanitizeState, type GameState } from "./engine";

export async function loadAndTick(userId: string, now: number) {
  await ensureSchema();
  const db = sql();
  const rows = await db`SELECT state, version FROM game_states WHERE user_id = ${userId} LIMIT 1`;
  let state: GameState;
  if (!rows.length) {
    state = defaultState(now);
    await db`INSERT INTO game_states (user_id, state, version, last_tick_at)
      VALUES (${userId}, ${JSON.stringify(state)}::jsonb, 0, to_timestamp(${now / 1000}))
      ON CONFLICT (user_id) DO NOTHING`;
  } else {
    state = sanitizeState(rows[0].state, now);
    state.version = Number(rows[0].version) || 0;
  }
  const ticked = applyElapsed(state, now);
  const granted = grantAchievements(ticked.state);
  granted.state.version = state.version;
  return { ...ticked, state: granted.state, unlocked: granted.unlocked };
}

export async function saveState(userId: string, prevVersion: number, state: GameState, now: number) {
  const db = sql();
  const nextVersion = prevVersion + 1;
  const payload = { ...state, version: nextVersion, lastTickAt: now };
  const updated = await db`UPDATE game_states
    SET state = ${JSON.stringify(payload)}::jsonb,
        version = ${nextVersion},
        last_tick_at = to_timestamp(${now / 1000}),
        updated_at = now()
    WHERE user_id = ${userId} AND version = ${prevVersion}
    RETURNING version`;
  if (!updated.length) {
    return { ok: false as const, reason: "conflict" };
  }
  return { ok: true as const, state: payload };
}

export async function claimIdempotency(userId: string, key: string | null) {
  if (!key) return true;
  const db = sql();
  try {
    await db`INSERT INTO idempotency_keys (user_id, key) VALUES (${userId}, ${key})`;
    return true;
  } catch {
    return false;
  }
}

export function parseKey(body: unknown) {
  if (!body || typeof body !== "object") return null;
  return validIdempotency((body as { requestId?: unknown }).requestId);
}

export function view(state: GameState, extra?: Record<string, unknown>) {
  return { ok: true, game: publicView(state), ...extra };
}
