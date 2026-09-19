import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { buyRegion, buyUpgrade, grantAchievements } from "@/lib/game/engine";
import { claimIdempotency, loadAndTick, parseKey, saveState, view } from "@/lib/game/store";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { kind?: string; id?: string; requestId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (body.kind !== "upgrade" && body.kind !== "region") {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }
  if (typeof body.id !== "string" || body.id.length > 40) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }
  const key = parseKey(body);
  if (!(await claimIdempotency(session.userId, key))) {
    const loaded = await loadAndTick(session.userId, Date.now());
    return NextResponse.json(view(loaded.state, { duplicate: true }));
  }
  const now = Date.now();
  const loaded = await loadAndTick(session.userId, now);
  const result =
    body.kind === "upgrade" ? buyUpgrade(loaded.state, body.id, now) : buyRegion(loaded.state, body.id, now);
  if (!result.ok) {
    const status = result.reason === "cooldown" ? 429 : 400;
    return NextResponse.json({ ok: false, error: result.reason, game: view(loaded.state).game }, { status });
  }
  const granted = grantAchievements(result.state);
  const saved = await saveState(session.userId, loaded.state.version, granted.state, now);
  if (!saved.ok) return NextResponse.json({ ok: false, error: "conflict" }, { status: 409 });
  return NextResponse.json(view(saved.state, { unlocked: granted.unlocked }));
}
