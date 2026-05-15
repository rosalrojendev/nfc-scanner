import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  createAnchor,
  getAccessibleProjectIds,
  getAnchor,
  listAnchors,
} from "@/lib/server-store";
import { anchorCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectIds = await getAccessibleProjectIds(session);
  return NextResponse.json({ anchors: await listAnchors({ projectIds }) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.editAnchor(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot create anchors." },
      { status: 403 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = anchorCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  if (!(await canAccessProject(session, parsed.data.projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  // Reject duplicate IDs (anchor IDs are user-visible like "RA-006").
  const existing = await getAnchor(parsed.data.id);
  if (existing) {
    return NextResponse.json(
      { error: `Anchor "${parsed.data.id}" already exists.` },
      { status: 409 },
    );
  }
  const anchor = await createAnchor(parsed.data);
  return NextResponse.json({ anchor }, { status: 201 });
}
