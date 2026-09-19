import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { applyClick, grantAchievements } from "@/lib/game/engine";
import { claimIdempotency, loadAndTick, parseKey, saveState, view } from "@/lib/game/store";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const key = parseKey(body);
  const claimed = await claimIdempotency(session.userId, key);
  if (!claimed) {
    const loaded = await loadAndTick(session.userId, Date.now());
    return NextResponse.json(view(loaded.state, { duplicate: true }));
  }
  const now = Date.now();
  const loaded = await loadAndTick(session.userId, now);
  const clicked = applyClick(loaded.state, now);
  if (!clicked.ok) {
    return NextResponse.json({ ok: false, error: clicked.reason, game: view(loaded.state).game }, { status: 429 });
  }
  const granted = grantAchievements(clicked.state);
  const saved = await saveState(session.userId, loaded.state.version, granted.state, now);
  if (!saved.ok) {
    return NextResponse.json({ ok: false, error: "conflict" }, { status: 409 });
  }
  return NextResponse.json(view(saved.state, { unlocked: granted.unlocked }));
}
