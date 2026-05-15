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
  const clients = await listManageableClients(session);
  if (clients.length === 0) {
    return NextResponse.json(
      { error: "You do not have tenant management permissions." },
      { status: 403 },
    );
  }
  const [projectsByClient, membershipsByClient, users] = await Promise.all([
    Promise.all(clients.map((c) => listProjectsForClient(c.id))),
    Promise.all(clients.map((c) => listMembershipsForClient(c.id))),
    session.role === "admin" ? listUsers() : Promise.resolve([]),
  ]);
  const projects = projectsByClient.flat();
  const memberships = membershipsByClient.flat();
  return NextResponse.json({
    isPlatformAdmin: session.role === "admin",
    clients,
    projects,
    memberships,
    users,
  });
}
