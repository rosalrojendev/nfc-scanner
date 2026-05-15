import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  deleteDrawing,
  getDrawing,
} from "@/lib/server-store";

export const runtime = "nodejs";

async function guard(
  id: string,
): Promise<
  | { ok: true; projectId: string }
  | { ok: false; status: number; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, status: 401, error: "Unauthorized" };
  const drawing = await getDrawing(id);
  if (
    !drawing ||
    !drawing.projectId ||
    !(await canAccessProject(session, drawing.projectId))
  ) {
    return { ok: false, status: 404, error: "Drawing not found" };
  }
  return { ok: true, projectId: drawing.projectId };
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.uploadDrawings(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot delete drawings." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const g = await guard(id);
  if (!g.ok) {
    return NextResponse.json({ error: g.error }, { status: g.status });
  }
  const ok = await deleteDrawing(id);
  return NextResponse.json({ ok });
}
