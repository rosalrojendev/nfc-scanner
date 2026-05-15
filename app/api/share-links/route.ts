import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canAccessProject,
  createShareLink,
  getAccessibleProjectIds,
  listShareLinks,
} from "@/lib/server-store";

export const runtime = "nodejs";

const createSchema = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1).max(120),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectIds = Array.from(await getAccessibleProjectIds(session));
  return NextResponse.json({
    shareLinks: await listShareLinks(projectIds),
  });
}

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
  const link = await createShareLink(parsed.data);
  return NextResponse.json({ link }, { status: 201 });
}
