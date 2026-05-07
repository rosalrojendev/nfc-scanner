import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listAnchors } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ anchors: listAnchors() });
}
