// Shared seed logic used by both `npm run db:seed` and the reset API route.
// Idempotent: re-running upserts the same records without duplicating.

import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEMO_PASSWORD = "AnchorTag!2026";

export async function seedAll(prisma: PrismaClient): Promise<{
  users: number;
  clients: number;
  projects: number;
  anchors: number;
  inspections: number;
  drawings: number;
}> {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "kamata@kamloopsropeaccess.com" },
      update: {},
      create: {
        id: "u-inspector",
        email: "kamata@kamloopsropeaccess.com",
        name: "Justin Kamata",
        role: "inspector",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@kamloopsropeaccess.com" },
      update: {},
      create: {
        id: "u-admin",
        email: "admin@kamloopsropeaccess.com",
        name: "S. Chen",
        role: "admin",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "client@anchorclient.com" },
      update: {},
      create: {
        id: "u-client",
        email: "client@anchorclient.com",
        name: "Client Viewer",
        role: "client",
        passwordHash,
      },
    }),
  ]);

  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: "client-kra" },
      update: { name: "Kamloops Rope Access" },
      create: { id: "client-kra", name: "Kamloops Rope Access" },
    }),
    prisma.client.upsert({
      where: { id: "client-hpg" },
      update: { name: "Heights Property Group" },
      create: { id: "client-hpg", name: "Heights Property Group" },
    }),
  ]);

  const projectSeeds = [
    {
      id: "proj-kot",
      clientId: "client-kra",
      name: "Kamloops Office Tower",
      reference: "PROJ-2024-KOT",
    },
    {
      id: "proj-cp",
      clientId: "client-kra",
      name: "Civic Plaza",
      reference: "PROJ-2024-CP",
    },
    {
      id: "proj-nra",
      clientId: "client-hpg",
      name: "North Ridge Apartments",
      reference: "PROJ-2024-NRA",
    },
    {
      id: "proj-rc",
      clientId: "client-hpg",
      name: "Riverside Complex",
      reference: "PROJ-2024-RC",
    },
  ];
  const projects = await Promise.all(
    projectSeeds.map((p) =>
      prisma.project.upsert({
        where: { id: p.id },
        update: { name: p.name, reference: p.reference },
        create: p,
      }),
    ),
  );

  const memberships = [
    { userId: "u-inspector", clientId: "client-kra", role: "admin" as const },
    { userId: "u-inspector", clientId: "client-hpg", role: "member" as const },
    { userId: "u-client", clientId: "client-kra", role: "member" as const },
  ];
  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_clientId: { userId: m.userId, clientId: m.clientId } },
      update: { role: m.role },
      create: m,
    });
  }

  const inspectorSeeds = [
    { clientId: "client-kra", name: "Justin Kamata" },
    { clientId: "client-kra", name: "A. Singh" },
    { clientId: "client-kra", name: "L. Foster" },
    { clientId: "client-kra", name: "M. Reed" },
    { clientId: "client-kra", name: "S. Chen" },
    { clientId: "client-hpg", name: "A. Singh" },
    { clientId: "client-hpg", name: "S. Chen" },
  ];
  for (const insp of inspectorSeeds) {
    await prisma.inspector.upsert({
      where: { clientId_name: { clientId: insp.clientId, name: insp.name } },
      update: {},
      create: insp,
    });
  }

  const anchorSeeds = [
    {
      id: "RA-03",
      projectId: "proj-kot",
      label: "RA-03 · North parapet",
      building: "Kamloops Office Tower",
      location: "Roof level B · NFC-RA-03-BC",
      drawing: "B-1 North parapet detail",
      status: "pass" as const,
      lastTested: new Date("2026-01-12T00:00:00.000Z"),
      nextDue: new Date("2027-01-12T00:00:00.000Z"),
      inspector: "Justin Kamata",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-03-BC",
      qrCode: "RA-03",
      positionX: 554,
      positionY: 286,
    },
    {
      id: "RA-17",
      projectId: "proj-nra",
      label: "RA-17 · East ladder line",
      building: "North Ridge Apartments",
      location: "East access · QR + NFC",
      drawing: "R-2 East plan",
      status: "due" as const,
      lastTested: new Date("2025-05-01T00:00:00.000Z"),
      nextDue: new Date("2026-05-01T00:00:00.000Z"),
      inspector: "A. Singh",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-17-NRA",
      qrCode: "RA-17",
      positionX: 232,
      positionY: 296,
    },
    {
      id: "RA-22",
      projectId: "proj-cp",
      label: "RA-22 · HVAC curb",
      building: "Civic Plaza",
      location: "Roof zone C · NFC tag",
      drawing: "RF-A",
      status: "pass" as const,
      lastTested: new Date("2025-11-04T00:00:00.000Z"),
      nextDue: new Date("2026-11-04T00:00:00.000Z"),
      inspector: "L. Foster",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-22-CP",
      qrCode: "RA-22",
      positionX: 392,
      positionY: 150,
    },
    {
      id: "RA-08",
      projectId: "proj-kot",
      label: "RA-08 · West parapet",
      building: "Kamloops Office Tower",
      location: "Roof level B · West edge",
      drawing: "B-1 West parapet detail",
      status: "failed" as const,
      lastTested: new Date("2026-02-19T00:00:00.000Z"),
      nextDue: new Date("2026-04-19T00:00:00.000Z"),
      inspector: "M. Reed",
      proofResult: "Failed at 18 kN — replaced fastener",
      nfcTag: "NFC-RA-08-BC",
      qrCode: "RA-08",
      positionX: 132,
      positionY: 122,
    },
    {
      id: "RA-11",
      projectId: "proj-nra",
      label: "RA-11 · South ladder",
      building: "North Ridge Apartments",
      location: "South stair head",
      drawing: "R-2 South plan",
      status: "pass" as const,
      lastTested: new Date("2026-03-02T00:00:00.000Z"),
      nextDue: new Date("2027-03-02T00:00:00.000Z"),
      inspector: "S. Chen",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-11-NRA",
      qrCode: "RA-11",
      positionX: 612,
      positionY: 188,
    },
  ];
  for (const a of anchorSeeds) {
    await prisma.anchor.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  const inspectionSeeds = [
    {
      id: "ins-seed-1",
      projectId: "proj-kot",
      anchorId: "RA-03",
      inspector: "Justin Kamata",
      testDate: new Date("2026-01-12T00:00:00.000Z"),
      nextDueDate: new Date("2027-01-12T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "B-1 North parapet detail",
      notes:
        "Flashing intact, post secure, identification plate readable, NFC verified.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-01-12T15:30:00.000Z"),
    },
    {
      id: "ins-seed-2",
      projectId: "proj-kot",
      anchorId: "RA-03",
      inspector: "A. Singh",
      testDate: new Date("2025-01-10T00:00:00.000Z"),
      nextDueDate: new Date("2026-01-10T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "B-1 North parapet detail",
      notes: "Re-labeled on roof plan",
      photos: [],
      signature: null,
      createdAt: new Date("2025-01-10T11:12:00.000Z"),
    },
    {
      id: "ins-seed-3",
      projectId: "proj-kot",
      anchorId: "RA-08",
      inspector: "M. Reed",
      testDate: new Date("2026-02-19T00:00:00.000Z"),
      nextDueDate: new Date("2026-04-19T00:00:00.000Z"),
      result: "failed" as const,
      proofLoad: "Failed at 18 kN — replaced fastener",
      drawingRef: "B-1 West parapet detail",
      notes:
        "Fastener pulled before reaching 22 kN. Replaced with chemical anchor; awaiting re-test.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-02-19T18:02:00.000Z"),
    },
  ];
  for (const i of inspectionSeeds) {
    await prisma.inspection.upsert({
      where: { id: i.id },
      update: i,
      create: i,
    });
  }

  const drawingSeeds = [
    {
      id: "B-1",
      projectId: "proj-kot",
      building: "Kamloops Office Tower",
      level: "Roof level B",
      reference: "B-1",
      pins: [
        { anchorId: "RA-03", x: 554, y: 286, status: "pass" as const },
        { anchorId: "RA-08", x: 132, y: 122, status: "failed" as const },
      ],
    },
    {
      id: "R-2",
      projectId: "proj-nra",
      building: "North Ridge Apartments",
      level: "East roof",
      reference: "R-2",
      pins: [
        { anchorId: "RA-17", x: 232, y: 296, status: "due" as const },
        { anchorId: "RA-11", x: 612, y: 188, status: "pass" as const },
      ],
    },
  ];
  for (const d of drawingSeeds) {
    await prisma.drawing.upsert({
      where: { id: d.id },
      update: {
        projectId: d.projectId,
        building: d.building,
        level: d.level,
        reference: d.reference,
      },
      create: {
        id: d.id,
        projectId: d.projectId,
        building: d.building,
        level: d.level,
        reference: d.reference,
      },
    });
    for (const p of d.pins) {
      await prisma.drawingPin.upsert({
        where: {
          drawingId_anchorId: { drawingId: d.id, anchorId: p.anchorId },
        },
        update: { x: p.x, y: p.y, status: p.status },
        create: { drawingId: d.id, ...p },
      });
    }
  }

  return {
    users: users.length,
    clients: clients.length,
    projects: projects.length,
    anchors: anchorSeeds.length,
    inspections: inspectionSeeds.length,
    drawings: drawingSeeds.length,
  };
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  // Order matters — children before parents.
  await prisma.drawingPin.deleteMany();
  await prisma.drawingAttachment.deleteMany();
  await prisma.drawing.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.anchor.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.inspector.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  // Users intentionally NOT deleted — keeps sessions valid across resets.
  await seedAll(prisma);
}
