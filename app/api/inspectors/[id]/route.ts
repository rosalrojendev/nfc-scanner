import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageClient,
  deleteInspector,
  getInspector,
  updateInspector,
} from "@/lib/server-store";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getInspector(id);
  if (!existing) {
    return NextResponse.json({ error: "Inspector not found" }, { status: 404 });
  }
  if (!(await canManageClient(session, existing.clientId))) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
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
  const inspector = await updateInspector(id, parsed.data);
  return NextResponse.json({ inspector });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getInspector(id);
  if (!existing) {
    return NextResponse.json({ error: "Inspector not found" }, { status: 404 });
  }
  if (!(await canManageClient(session, existing.clientId))) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  const ok = await deleteInspector(id);
  return NextResponse.json({ ok });
}
