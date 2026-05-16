import { NextResponse } from "next/server";
import { getSession, listUsers } from "@/lib/auth";
import {
  listManageableClients,
  listProjectsForClient,
  listMembershipsForClient,
} from "@/lib/server-store";
import { prisma } from "@/lib/db";

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
  const [projectsByClient, membershipsByClient] = await Promise.all([
    Promise.all(clients.map((c) => listProjectsForClient(c.id))),
    Promise.all(clients.map((c) => listMembershipsForClient(c.id))),
  ]);
  const projects = projectsByClient.flat();
  const memberships = membershipsByClient.flat();

  // Platform admin gets every user (so they can add new memberships from a
  // picker). Client admins only get the users already in their clients —
  // enough to render names against memberships without leaking other users.
  let users: Array<{ id: string; email: string; name: string; role: string }>;
  if (session.role === "admin") {
    users = await listUsers();
  } else {
    const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
    if (userIds.length === 0) {
      users = [];
    } else {
      const rows = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true, role: true },
        orderBy: { name: "asc" },
      });
      users = rows;
    }
  }
  return NextResponse.json({
    isPlatformAdmin: session.role === "admin",
    clients,
    projects,
    memberships,
    users,
  });
}
