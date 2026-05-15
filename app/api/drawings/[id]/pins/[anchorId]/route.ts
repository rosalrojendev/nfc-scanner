import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  canAccessProject,
  getDrawing,
  removeDrawingPin,
} from "@/lib/server-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  {
    params,
  }: { params: Promise<{ id: string; anchorId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, anchorId } = await params;
  const drawing = await getDrawing(id);
  if (
    !drawing ||
    !drawing.projectId ||
    !(await canAccessProject(session, drawing.projectId))
  ) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  }
  const ok = await removeDrawingPin(id, anchorId);
  return NextResponse.json({ ok });
}
