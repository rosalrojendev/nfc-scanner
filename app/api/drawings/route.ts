import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  createDrawing,
  getAccessibleProjectIds,
  listDrawings,
} from "@/lib/server-store";

export const runtime = "nodejs";

const createSchema = z.object({
  projectId: z.string().min(1),
  building: z.string().min(2).max(120),
  level: z.string().min(1).max(120),
  reference: z.string().min(1).max(120),
  planUrl: z.string().url().optional().nullable(),
  planContentType: z.string().max(120).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectIds = await getAccessibleProjectIds(session);
  return NextResponse.json({
    drawings: await listDrawings({ projectIds }),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.uploadDrawings(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot create drawings." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  if (!(await canAccessProject(session, parsed.data.projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  const drawing = await createDrawing({
    projectId: parsed.data.projectId,
    building: parsed.data.building,
    level: parsed.data.level,
    reference: parsed.data.reference,
    planUrl: parsed.data.planUrl ?? null,
    planContentType: parsed.data.planContentType,
  });
  return NextResponse.json({ drawing }, { status: 201 });
}
