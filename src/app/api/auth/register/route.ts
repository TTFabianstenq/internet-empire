import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { setSessionCookie, signSession, validatePassword, validateUsername } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { defaultState } from "@/lib/game/engine";
import { newId } from "@/lib/security/ids";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const username = validateUsername(body.username ?? "");
  if (!username || !validatePassword(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const db = sql();
    const id = newId();
    const hash = await bcrypt.hash(body.password!, 10);
    await db`INSERT INTO users (id, username, password_hash) VALUES (${id}, ${username}, ${hash})`;
    const now = Date.now();
    const state = defaultState(now);
    await db`INSERT INTO game_states (user_id, state, version, last_tick_at)
      VALUES (${id}, ${JSON.stringify(state)}::jsonb, 0, to_timestamp(${now / 1000}))`;
    const token = await signSession(id, username);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ ok: false, error: "username_taken" }, { status: 409 });
    }
    if (msg.includes("DATABASE_URL") || msg.includes("AUTH_SECRET")) {
      return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}
