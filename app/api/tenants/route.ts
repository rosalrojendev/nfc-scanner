import { NextResponse } from "next/server";
import { getSession, listUsers } from "@/lib/auth";
import {
  listManageableClients,
  listProjectsForClient,
  listMembershipsForClient,
} from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clients = listManageableClients(session);
  if (clients.length === 0) {
    return NextResponse.json(
      { error: "You do not have tenant management permissions." },
      { status: 403 },
    );
  }
  const projects = clients.flatMap((c) => listProjectsForClient(c.id));
  const memberships = clients.flatMap((c) => listMembershipsForClient(c.id));
  const users = session.role === "admin" ? listUsers() : [];
  return NextResponse.json({
    isPlatformAdmin: session.role === "admin",
    clients,
    projects,
    memberships,
    users,
  });
}
