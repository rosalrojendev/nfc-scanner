import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canAccessProject,
  getAnchor,
  getDrawing,
  upsertDrawingPin,
} from "@/lib/server-store";

export const runtime = "nodejs";

const schema = z.object({
  anchorId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  status: z.enum(["pass", "due", "failed"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  // The anchor must exist and be in an accessible project too.
  const anchor = await getAnchor(parsed.data.anchorId);
  if (!anchor || !(await canAccessProject(session, anchor.projectId))) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }
  const pin = await upsertDrawingPin(id, parsed.data);
  return NextResponse.json({ pin }, { status: 201 });
}
