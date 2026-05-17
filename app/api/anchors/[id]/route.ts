import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  getAnchor,
  softDeleteAnchor,
  upsertAnchor,
} from "@/lib/server-store";
import { anchorPatchSchema } from "@/lib/validation";

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
  const anchor = await getAnchor(id);
  if (!anchor || !(await canAccessProject(session, anchor.projectId))) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }
  return NextResponse.json({ anchor });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.editAnchor(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot edit anchors." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const anchor = await getAnchor(id);
  if (!anchor || !(await canAccessProject(session, anchor.projectId))) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = anchorPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  // Empty nfcTag string from the form means "clear it" — normalise to
  // undefined so upsertAnchor stamps the column to null.
  const normalised = {
    ...parsed.data,
    ...(parsed.data.nfcTag === ""
      ? { nfcTag: undefined }
      : {}),
  };
  const updated = await upsertAnchor({ ...anchor, ...normalised });
  return NextResponse.json({ anchor: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.deleteAnchor(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot delete anchors." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const anchor = await getAnchor(id);
  if (!anchor || !(await canAccessProject(session, anchor.projectId))) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }
  const ok = await softDeleteAnchor(id, { id: session.id, name: session.name });
  return NextResponse.json({ ok });
}
