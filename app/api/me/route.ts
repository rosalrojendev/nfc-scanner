import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getUserPrefs, updateUserPrefs } from "@/lib/server-store";

export const runtime = "nodejs";

const patchSchema = z.object({
  avatarUrl: z.string().url().nullable().optional(),
  reminderSixtyDay: z.boolean().optional(),
  reminderThirtyDay: z.boolean().optional(),
  reminderSevenDay: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getUserPrefs(session.id);
  if (!prefs) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ userId: session.id, prefs });
}

export async function PATCH(req: Request) {
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const prefs = await updateUserPrefs(session.id, parsed.data);
  return NextResponse.json({ userId: session.id, prefs });
}
