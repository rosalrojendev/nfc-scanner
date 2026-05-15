import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageClient,
  getClient,
  getProject,
  upsertProject,
} from "@/lib/server-store";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2, "Project name must be at least 2 characters.").max(120),
  reference: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!(await getClient(parsed.data.clientId))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!(await canManageClient(session, parsed.data.clientId))) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  let id = uid("proj");
  while (await getProject(id)) id = uid("proj");
  const project = await upsertProject({
    id,
    clientId: parsed.data.clientId,
    name: parsed.data.name.trim(),
    reference: parsed.data.reference?.trim() || undefined,
  });
  return NextResponse.json({ project }, { status: 201 });
}
