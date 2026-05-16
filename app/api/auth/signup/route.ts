import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signupSchema } from "@/lib/validation";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimitOk(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  b.count += 1;
  return b.count <= RATE_LIMIT_MAX;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimitOk(ip)) {
    return NextResponse.json(
      { error: "Too many signups. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const { email, password, name, role, companyName, projectName } =
    parsed.data;
  const lowerEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: lowerEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: lowerEmail,
        name: name.trim(),
        role,
        passwordHash,
      },
    });

    if (role === "client") {
      const client = await tx.client.create({
        data: { name: companyName!.trim() },
      });
      await tx.project.create({
        data: {
          clientId: client.id,
          name: projectName?.trim() || `${companyName!.trim()} — main`,
        },
      });
      await tx.membership.create({
        data: {
          userId: newUser.id,
          clientId: client.id,
          role: "admin",
        },
      });
    }

    return newUser;
  });

  await setSessionCookie({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
