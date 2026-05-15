import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageClient,
  createInspector,
  getAccessibleProjectIds,
  listInspectors,
  listProjects,
} from "@/lib/server-store";

export const runtime = "nodejs";

const createSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2).max(120),
  avatarUrl: z.string().url().optional().nullable(),
});

async function accessibleClientIds(
  session: Awaited<ReturnType<typeof getSession>>,
): Promise<string[]> {
  if (!session) return [];
  const [projectIds, allProjects] = await Promise.all([
    getAccessibleProjectIds(session),
    listProjects(),
  ]);
  return Array.from(
    new Set(
      allProjects
        .filter((p) => projectIds.has(p.id))
        .map((p) => p.clientId),
    ),
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientIds = await accessibleClientIds(session);
  return NextResponse.json({
    inspectors: await listInspectors(clientIds),
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
  if (!(await canManageClient(session, parsed.data.clientId))) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  try {
    const inspector = await createInspector(parsed.data);
    return NextResponse.json({ inspector }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error && /unique/i.test(e.message)
      ? "An inspector with that name already exists for this client."
      : "Failed to create inspector.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
