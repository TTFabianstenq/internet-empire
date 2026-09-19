import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, username: session.username });
}
