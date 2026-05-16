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
    prisma.user.upsert({
      where: { email: "aria@kamloopsropeaccess.com" },
      update: {},
      create: {
        id: "u-inspector-2",
        email: "aria@kamloopsropeaccess.com",
        name: "Aria Patel",
        role: "inspector",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "marcus@heightspg.com" },
      update: {},
      create: {
        id: "u-inspector-3",
        email: "marcus@heightspg.com",
        name: "Marcus Reed",
        role: "inspector",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "tom@riverstone.com" },
      update: {},
      create: {
        id: "u-inspector-4",
        email: "tom@riverstone.com",
        name: "Tom Quinn",
        role: "inspector",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "sophie@riverstone.com" },
      update: {},
      create: {
        id: "u-client-2",
        email: "sophie@riverstone.com",
        name: "Sophie Lin",
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
    prisma.client.upsert({
      where: { id: "client-rs" },
      update: { name: "Riverstone Properties" },
      create: { id: "client-rs", name: "Riverstone Properties" },
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
      id: "proj-bridge",
      clientId: "client-kra",
      name: "Mountain Bridge Access",
      reference: "PROJ-2024-MBA",
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
    {
      id: "proj-rsm",
      clientId: "client-rs",
      name: "Riverstone Mall",
      reference: "PROJ-2025-RSM",
    },
    {
      id: "proj-rsa",
      clientId: "client-rs",
      name: "Riverstone Apartments",
      reference: "PROJ-2025-RSA",
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
    // KRA
    { userId: "u-inspector", clientId: "client-kra", role: "admin" as const },
    { userId: "u-inspector-2", clientId: "client-kra", role: "member" as const },
    { userId: "u-client", clientId: "client-kra", role: "member" as const },
    // HPG
    { userId: "u-inspector", clientId: "client-hpg", role: "member" as const },
    { userId: "u-inspector-3", clientId: "client-hpg", role: "member" as const },
    // Riverstone
    { userId: "u-client-2", clientId: "client-rs", role: "admin" as const },
    { userId: "u-inspector-4", clientId: "client-rs", role: "member" as const },
  ];
  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { userId_clientId: { userId: m.userId, clientId: m.clientId } },
      update: { role: m.role },
      create: m,
    });
  }

  // Roster: every inspector entry is backed by a real User account.
  const inspectorSeeds = [
    { clientId: "client-kra", userId: "u-inspector", name: "Justin Kamata" },
    { clientId: "client-kra", userId: "u-inspector-2", name: "Aria Patel" },
    { clientId: "client-hpg", userId: "u-inspector", name: "Justin Kamata" },
    { clientId: "client-hpg", userId: "u-inspector-3", name: "Marcus Reed" },
    { clientId: "client-rs", userId: "u-inspector-4", name: "Tom Quinn" },
  ];
  for (const insp of inspectorSeeds) {
    await prisma.inspector.upsert({
      where: {
        clientId_userId: { clientId: insp.clientId, userId: insp.userId },
      },
      update: { name: insp.name },
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
      inspector: "Justin Kamata",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-11-NRA",
      qrCode: "RA-11",
      positionX: 612,
      positionY: 188,
    },
    // KOT — 2 more
    {
      id: "RA-04",
      projectId: "proj-kot",
      label: "RA-04 · East parapet",
      building: "Kamloops Office Tower",
      location: "Roof level B · East edge",
      drawing: "B-1 East parapet detail",
      status: "pass" as const,
      lastTested: new Date("2026-02-08T00:00:00.000Z"),
      nextDue: new Date("2027-02-08T00:00:00.000Z"),
      inspector: "Aria Patel",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-04-KOT",
      qrCode: "RA-04",
      positionX: 666,
      positionY: 160,
    },
    {
      id: "RA-05",
      projectId: "proj-kot",
      label: "RA-05 · South parapet",
      building: "Kamloops Office Tower",
      location: "Roof level B · South edge",
      drawing: "B-1 South parapet detail",
      status: "due" as const,
      lastTested: new Date("2025-04-22T00:00:00.000Z"),
      nextDue: new Date("2026-04-22T00:00:00.000Z"),
      inspector: "Justin Kamata",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-05-KOT",
      qrCode: "RA-05",
      positionX: 392,
      positionY: 332,
    },
    // CP — 2 more
    {
      id: "RA-23",
      projectId: "proj-cp",
      label: "RA-23 · East HVAC bracket",
      building: "Civic Plaza",
      location: "Roof zone E · NFC tag",
      drawing: "RF-A",
      status: "due" as const,
      lastTested: new Date("2025-06-15T00:00:00.000Z"),
      nextDue: new Date("2026-06-15T00:00:00.000Z"),
      inspector: "Justin Kamata",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-23-CP",
      qrCode: "RA-23",
      positionX: 540,
      positionY: 220,
    },
    {
      id: "RA-24",
      projectId: "proj-cp",
      label: "RA-24 · North safety line",
      building: "Civic Plaza",
      location: "Roof zone N · NFC tag",
      drawing: "RF-A",
      status: "failed" as const,
      lastTested: new Date("2026-03-18T00:00:00.000Z"),
      nextDue: new Date("2026-05-18T00:00:00.000Z"),
      inspector: "Justin Kamata",
      proofResult: "Failed at 16 kN — corrosion on baseplate",
      nfcTag: "NFC-RA-24-CP",
      qrCode: "RA-24",
      positionX: 240,
      positionY: 96,
    },
    // NRA — 1 more
    {
      id: "RA-12",
      projectId: "proj-nra",
      label: "RA-12 · West stair head",
      building: "North Ridge Apartments",
      location: "West stair head · NFC + QR",
      drawing: "R-2 West plan",
      status: "pass" as const,
      lastTested: new Date("2026-01-30T00:00:00.000Z"),
      nextDue: new Date("2027-01-30T00:00:00.000Z"),
      inspector: "Marcus Reed",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-12-NRA",
      qrCode: "RA-12",
      positionX: 110,
      positionY: 220,
    },
    // Mountain Bridge (KRA) — 2
    {
      id: "RA-30",
      projectId: "proj-bridge",
      label: "RA-30 · North bridge column",
      building: "Mountain Bridge",
      location: "Column N1 · upper anchor",
      drawing: "MB-1 north plan",
      status: "pass" as const,
      lastTested: new Date("2026-04-04T00:00:00.000Z"),
      nextDue: new Date("2027-04-04T00:00:00.000Z"),
      inspector: "Aria Patel",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-30-MB",
      qrCode: "RA-30",
      positionX: 220,
      positionY: 180,
    },
    {
      id: "RA-31",
      projectId: "proj-bridge",
      label: "RA-31 · South bridge column",
      building: "Mountain Bridge",
      location: "Column S1 · upper anchor",
      drawing: "MB-1 south plan",
      status: "due" as const,
      lastTested: new Date("2025-04-15T00:00:00.000Z"),
      nextDue: new Date("2026-04-15T00:00:00.000Z"),
      inspector: "Aria Patel",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-31-MB",
      qrCode: "RA-31",
      positionX: 540,
      positionY: 180,
    },
    // Riverstone Mall — 2
    {
      id: "RA-40",
      projectId: "proj-rsm",
      label: "RA-40 · Mall east entry",
      building: "Riverstone Mall",
      location: "Roof zone E · skylight perimeter",
      drawing: "RSM-A east",
      status: "pass" as const,
      lastTested: new Date("2026-03-25T00:00:00.000Z"),
      nextDue: new Date("2027-03-25T00:00:00.000Z"),
      inspector: "Tom Quinn",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-40-RSM",
      qrCode: "RA-40",
      positionX: 510,
      positionY: 240,
    },
    {
      id: "RA-41",
      projectId: "proj-rsm",
      label: "RA-41 · Mall west entry",
      building: "Riverstone Mall",
      location: "Roof zone W · skylight perimeter",
      drawing: "RSM-A west",
      status: "due" as const,
      lastTested: new Date("2025-05-10T00:00:00.000Z"),
      nextDue: new Date("2026-05-10T00:00:00.000Z"),
      inspector: "Tom Quinn",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-41-RSM",
      qrCode: "RA-41",
      positionX: 220,
      positionY: 240,
    },
    // Riverstone Apartments — 1
    {
      id: "RA-50",
      projectId: "proj-rsa",
      label: "RA-50 · Tower A roof",
      building: "Riverstone Apartments",
      location: "Tower A · north parapet",
      drawing: "RSA-1 north",
      status: "pass" as const,
      lastTested: new Date("2026-04-12T00:00:00.000Z"),
      nextDue: new Date("2027-04-12T00:00:00.000Z"),
      inspector: "Tom Quinn",
      proofResult: "22 kN proof-load passed",
      nfcTag: "NFC-RA-50-RSA",
      qrCode: "RA-50",
      positionX: 350,
      positionY: 200,
    },
  ];
  for (const a of anchorSeeds) {
    await prisma.anchor.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    });
  }

  // Seed Building entities from the distinct (projectId, building) pairs in
  // the anchor seed. Project-scoped, unique by name within a project.
  const buildingPairs = new Map<string, { projectId: string; name: string }>();
  for (const a of anchorSeeds) {
    const key = `${a.projectId}::${a.building}`;
    if (!buildingPairs.has(key)) {
      buildingPairs.set(key, { projectId: a.projectId, name: a.building });
    }
  }
  for (const b of buildingPairs.values()) {
    await prisma.building.upsert({
      where: {
        projectId_name: { projectId: b.projectId, name: b.name },
      },
      update: {},
      create: b,
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
      inspector: "Justin Kamata",
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
    {
      id: "ins-seed-4",
      projectId: "proj-kot",
      anchorId: "RA-04",
      inspector: "Aria Patel",
      testDate: new Date("2026-02-08T00:00:00.000Z"),
      nextDueDate: new Date("2027-02-08T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "B-1 East parapet detail",
      notes: "Tag verified, baseplate clean, fastener torque within spec.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-02-08T13:45:00.000Z"),
    },
    {
      id: "ins-seed-5",
      projectId: "proj-cp",
      anchorId: "RA-24",
      inspector: "Justin Kamata",
      testDate: new Date("2026-03-18T00:00:00.000Z"),
      nextDueDate: new Date("2026-05-18T00:00:00.000Z"),
      result: "failed" as const,
      proofLoad: "Failed at 16 kN — corrosion on baseplate",
      drawingRef: "RF-A",
      notes:
        "Salt-air corrosion on baseplate, replaced with stainless variant. Re-test scheduled.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-03-18T16:22:00.000Z"),
    },
    {
      id: "ins-seed-6",
      projectId: "proj-nra",
      anchorId: "RA-12",
      inspector: "Marcus Reed",
      testDate: new Date("2026-01-30T00:00:00.000Z"),
      nextDueDate: new Date("2027-01-30T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "R-2 West plan",
      notes: "All pass, photos taken.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-01-30T10:11:00.000Z"),
    },
    {
      id: "ins-seed-7",
      projectId: "proj-bridge",
      anchorId: "RA-30",
      inspector: "Aria Patel",
      testDate: new Date("2026-04-04T00:00:00.000Z"),
      nextDueDate: new Date("2027-04-04T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "MB-1 north plan",
      notes: "First seasonal certification — all clear.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-04-04T09:30:00.000Z"),
    },
    {
      id: "ins-seed-8",
      projectId: "proj-rsm",
      anchorId: "RA-40",
      inspector: "Tom Quinn",
      testDate: new Date("2026-03-25T00:00:00.000Z"),
      nextDueDate: new Date("2027-03-25T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "RSM-A east",
      notes: "Initial commissioning — passed first inspection.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-03-25T14:05:00.000Z"),
    },
    {
      id: "ins-seed-9",
      projectId: "proj-rsa",
      anchorId: "RA-50",
      inspector: "Tom Quinn",
      testDate: new Date("2026-04-12T00:00:00.000Z"),
      nextDueDate: new Date("2027-04-12T00:00:00.000Z"),
      result: "pass" as const,
      proofLoad: "22 kN proof-load passed",
      drawingRef: "RSA-1 north",
      notes: "Annual cert.",
      photos: [],
      signature: null,
      createdAt: new Date("2026-04-12T11:00:00.000Z"),
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
        { anchorId: "RA-12", x: 110, y: 220, status: "pass" as const },
      ],
    },
    {
      id: "MB-1",
      projectId: "proj-bridge",
      building: "Mountain Bridge",
      level: "Upper deck",
      reference: "MB-1",
      pins: [
        { anchorId: "RA-30", x: 220, y: 180, status: "pass" as const },
        { anchorId: "RA-31", x: 540, y: 180, status: "due" as const },
      ],
    },
    {
      id: "RSM-A",
      projectId: "proj-rsm",
      building: "Riverstone Mall",
      level: "Roof",
      reference: "RSM-A",
      pins: [
        { anchorId: "RA-40", x: 510, y: 240, status: "pass" as const },
        { anchorId: "RA-41", x: 220, y: 240, status: "due" as const },
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
  await prisma.building.deleteMany();
  await prisma.shareLink.deleteMany();
  await prisma.inspector.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  // Users intentionally NOT deleted — keeps sessions valid across resets.
  await seedAll(prisma);
}
