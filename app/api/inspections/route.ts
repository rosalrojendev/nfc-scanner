import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { listInspections, saveInspection } from "@/lib/server-store";
import { inspectionInputSchema } from "@/lib/validation";
import { uid } from "@/lib/utils";
import type { Inspection } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const anchorId = url.searchParams.get("anchorId") ?? undefined;
  return NextResponse.json({
    inspections: listInspections({ anchorId }),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.logInspection(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot log inspections." },
      { status: 403 },
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
  const now = new Date().toISOString();
  const inspection: Inspection = {
    id: uid("ins"),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
    submittedBy: session.id,
    submittedByName: session.name,
    submittedByRole: session.role,
  };
  const saved = saveInspection(inspection);
  return NextResponse.json({ inspection: saved }, { status: 201 });
}
