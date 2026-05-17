import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  deleteInspection,
  getInspection,
  saveInspection,
} from "@/lib/server-store";
import { inspectionInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const inspection = await getInspection(id);
  if (!inspection || !(await canAccessProject(session, inspection.projectId))) {
    return NextResponse.json(
      { error: "Inspection not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ inspection });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.editInspection(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot edit inspections." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const existing = await getInspection(id);
  if (!existing || !(await canAccessProject(session, existing.projectId))) {
    return NextResponse.json(
      { error: "Inspection not found" },
      { status: 404 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inspectionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const updated = await saveInspection({
    ...existing,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ inspection: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.deleteInspection(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot delete inspections." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const existing = await getInspection(id);
  if (!existing || !(await canAccessProject(session, existing.projectId))) {
    return NextResponse.json(
      { error: "Inspection not found" },
      { status: 404 },
    );
  }
  const ok = await deleteInspection(id, {
    id: session.id,
    name: session.name,
  });
  return NextResponse.json({ ok });
}
