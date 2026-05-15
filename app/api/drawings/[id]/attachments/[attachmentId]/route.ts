import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  getDrawing,
  removeDrawingAttachment,
} from "@/lib/server-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; attachmentId: string }>;
  },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.uploadDrawings(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot edit drawings." },
      { status: 403 },
    );
  }
  const { id, attachmentId } = await params;
  const drawing = await getDrawing(id);
  if (
    !drawing ||
    !drawing.projectId ||
    !(await canAccessProject(session, drawing.projectId))
  ) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  }
  const ok = await removeDrawingAttachment(attachmentId);
  return NextResponse.json({ ok });
}
