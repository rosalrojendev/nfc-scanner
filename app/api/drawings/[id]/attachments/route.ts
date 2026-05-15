import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  addDrawingAttachment,
  canAccessProject,
  getDrawing,
} from "@/lib/server-store";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(["plan", "detail", "pdf"]),
  label: z.string().min(1).max(64),
  url: z.string().url(),
  contentType: z.string().max(120).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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
  const { id } = await params;
  const drawing = await getDrawing(id);
  if (
    !drawing ||
    !drawing.projectId ||
    !(await canAccessProject(session, drawing.projectId))
  ) {
    return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const attachment = await addDrawingAttachment(id, parsed.data);
  return NextResponse.json({ attachment }, { status: 201 });
}
