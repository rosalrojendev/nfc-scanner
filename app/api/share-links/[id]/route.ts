import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canAccessProject,
  deleteShareLink,
  getShareLink,
} from "@/lib/server-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const link = await getShareLink(id);
  if (!link || !(await canAccessProject(session, link.projectId))) {
    return NextResponse.json({ error: "Share link not found" }, { status: 404 });
  }
  const ok = await deleteShareLink(id);
  return NextResponse.json({ ok });
}
