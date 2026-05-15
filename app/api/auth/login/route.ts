import { NextResponse } from "next/server";
import {
  findUserByEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

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
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message || "Check the email and passcode.",
      },
      { status: 400 },
    );
  }
  const { email, password, role } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: "Email or passcode is incorrect." },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Email or passcode is incorrect." },
      { status: 401 },
    );
  }

  if (user.role !== role) {
    return NextResponse.json(
      {
        error: `This account is registered as ${user.role}, not ${role}.`,
      },
      { status: 403 },
    );
  }

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
