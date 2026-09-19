import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { loadAndTick, saveState, view } from "@/lib/game/store";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const now = Date.now();
    const loaded = await loadAndTick(session.userId, now);
    const saved = await saveState(session.userId, loaded.state.version, loaded.state, now);
    const state = saved.ok ? saved.state : loaded.state;
    return NextResponse.json(
      view(state, {
        offline: {
          elapsedMs: loaded.elapsedMs,
          gained: loaded.gained,
          unlocked: loaded.unlocked
        }
      })
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("DATABASE_URL") || msg.includes("AUTH_SECRET")) {
      return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "state_failed" }, { status: 500 });
  }
}
