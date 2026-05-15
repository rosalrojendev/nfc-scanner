import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserById, getSession } from "@/lib/auth";
import {
  canManageClient,
  getClient,
  removeMembership,
  upsertMembership,
} from "@/lib/server-store";

export const runtime = "nodejs";

const upsertSchema = z.object({
  userId: z.string().min(1),
  clientId: z.string().min(1),
  role: z.enum(["admin", "member"]),
});

const removeSchema = z.object({
  userId: z.string().min(1),
  clientId: z.string().min(1),
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
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  if (!getClient(parsed.data.clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!canManageClient(session, parsed.data.clientId)) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  if (!findUserById(parsed.data.userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const membership = upsertMembership(parsed.data);
  return NextResponse.json({ membership }, { status: 201 });
}

export async function DELETE(req: Request) {
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
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  if (!canManageClient(session, parsed.data.clientId)) {
    return NextResponse.json(
      { error: "You are not an admin on this client." },
      { status: 403 },
    );
  }
  if (
    parsed.data.userId === session.id &&
    session.role !== "admin"
  ) {
    return NextResponse.json(
      { error: "You can't remove yourself from a client you administer." },
      { status: 400 },
    );
  }
  const ok = removeMembership(parsed.data.userId, parsed.data.clientId);
  return NextResponse.json({ ok });
}
