import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { applyPrestige, grantAchievements } from "@/lib/game/engine";
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
  if (!(await claimIdempotency(session.userId, parseKey(body)))) {
    const loaded = await loadAndTick(session.userId, Date.now());
    return NextResponse.json(view(loaded.state, { duplicate: true }));
  }
  const now = Date.now();
  const loaded = await loadAndTick(session.userId, now);
  const result = applyPrestige(loaded.state, now);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason, game: view(loaded.state).game }, { status: 400 });
  }
  const granted = grantAchievements(result.state);
  const saved = await saveState(session.userId, loaded.state.version, granted.state, now);
  if (!saved.ok) return NextResponse.json({ ok: false, error: "conflict" }, { status: 409 });
  return NextResponse.json(view(saved.state, { prestigeGained: result.gained, unlocked: granted.unlocked }));
}
