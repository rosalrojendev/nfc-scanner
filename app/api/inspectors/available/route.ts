import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageClient } from "@/lib/server-store";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Lists inspector-role users not yet rostered for the given client.
// Used by the manage-users dialog as the picker source.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 },
    );
  }
  if (!(await canManageClient(session, clientId))) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  const existingRoster = await prisma.inspector.findMany({
    where: { clientId },
    select: { userId: true },
  });
  const excluded = new Set(existingRoster.map((r) => r.userId));
  const candidates = await prisma.user.findMany({
    where: { role: "inspector" },
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    users: candidates.filter((u) => !excluded.has(u.id)),
  });
}
