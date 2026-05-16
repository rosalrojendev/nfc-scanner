import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import type { Role, SessionUser } from "./types";
import { SESSION_COOKIE } from "./auth-constants";
import { prisma } from "./db";

export { SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    "dev-only-secret-change-me-32-bytes-minimum-please";
  return new TextEncoder().encode(raw);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

const DEMO_PASSWORD = "AnchorTag!2026";

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const u = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return u
    ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
      }
    : null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u
    ? {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
      }
    : null;
}

export async function listUsers(): Promise<
  Array<Pick<AuthUser, "id" | "email" | "name" | "role">>
> {
  const rows = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return rows;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    const role = payload.role as Role;
    if (!["inspector", "admin", "client"].includes(role)) return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so the cookie is sent on top-level GET navigations from outside
    // the site — e.g. tapping an NFC URL from iOS's notification, or
    // following an email link. Still blocks the cookie on CSRF-risky
    // cross-site POST/PUT/DELETE requests.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const DEMO_USERS = {
  inspector: {
    email: "kamata@kamloopsropeaccess.com",
    password: DEMO_PASSWORD,
  },
  admin: {
    email: "admin@kamloopsropeaccess.com",
    password: DEMO_PASSWORD,
  },
  client: {
    email: "client@anchorclient.com",
    password: DEMO_PASSWORD,
  },
} as const;
