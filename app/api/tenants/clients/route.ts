import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getClient, upsertClient } from "@/lib/server-store";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters.").max(120),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Only platform admins can create clients." },
      { status: 403 },
    );
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
  let id = uid("client");
  while (await getClient(id)) id = uid("client");
  const client = await upsertClient({ id, name: parsed.data.name.trim() });
  return NextResponse.json({ client }, { status: 201 });
}
