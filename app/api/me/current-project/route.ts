import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { canAccessProject } from "@/lib/server-store";
import { setCurrentProjectCookie } from "@/lib/project-context-helpers";

export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1, "Project ID is required."),
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  if (!canAccessProject(session, parsed.data.projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  await setCurrentProjectCookie(parsed.data.projectId);
  return NextResponse.json({ ok: true });
}
