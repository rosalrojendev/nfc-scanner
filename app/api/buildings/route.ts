import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  canAccessProject,
  createBuilding,
  getAccessibleProjectIds,
  listBuildings,
} from "@/lib/server-store";

export const runtime = "nodejs";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z
    .string()
    .min(2, "Building name must be at least 2 characters.")
    .max(120, "Building name is too long."),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projectIds = Array.from(await getAccessibleProjectIds(session));
  return NextResponse.json({
    buildings: await listBuildings(projectIds),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can.editAnchor(session.role)) {
    return NextResponse.json(
      { error: "Your role cannot create buildings." },
      { status: 403 },
    );
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
  try {
    const building = await createBuilding(parsed.data);
    return NextResponse.json({ building }, { status: 201 });
  } catch (e) {
    const msg =
      e instanceof Error && /unique/i.test(e.message)
        ? "A building with that name already exists in this project."
        : "Failed to create building.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
