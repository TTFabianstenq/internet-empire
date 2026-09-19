import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { setSessionCookie, signSession, validatePassword, validateUsername } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

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
    const rows = await db`SELECT id, password_hash FROM users WHERE username = ${username} LIMIT 1`;
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }
    const ok = await bcrypt.compare(body.password!, String(rows[0].password_hash));
    if (!ok) return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    const token = await signSession(String(rows[0].id), username);
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("DATABASE_URL") || msg.includes("AUTH_SECRET")) {
      return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "login_failed" }, { status: 500 });
  }
}
