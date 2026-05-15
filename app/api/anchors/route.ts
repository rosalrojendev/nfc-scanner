import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAccessibleProjectIds, listAnchors } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectIds = getAccessibleProjectIds(session);
  return NextResponse.json({ anchors: listAnchors({ projectIds }) });
}
