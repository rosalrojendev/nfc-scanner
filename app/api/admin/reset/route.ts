import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { resetStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.resetStore(session.role)) {
    return NextResponse.json(
      { error: "Admin only" },
      { status: 403 },
    );
  }
  resetStore();
  return NextResponse.json({ ok: true });
}
