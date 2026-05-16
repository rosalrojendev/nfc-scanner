import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  deleteBuilding,
  getBuilding,
  updateBuilding,
} from "@/lib/server-store";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

async function loadAndGuard(id: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401 } as const;
  if (!can.editAnchor(session.role)) {
    return { error: "Your role cannot edit buildings.", status: 403 } as const;
  }
  const building = await getBuilding(id);
  if (!building || !(await canAccessProject(session, building.projectId))) {
    return { error: "Building not found", status: 404 } as const;
  }
  return { building } as const;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await loadAndGuard(id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  try {
    const building = await updateBuilding(id, parsed.data);
    return NextResponse.json({ building });
  } catch (e) {
    const msg =
      e instanceof Error && /unique/i.test(e.message)
        ? "A building with that name already exists in this project."
        : "Failed to update building.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await loadAndGuard(id);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const ok = await deleteBuilding(id);
  return NextResponse.json({ ok });
}
