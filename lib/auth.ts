import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import type { Role, SessionUser } from "./types";
import { SESSION_COOKIE } from "./auth-constants";

export { SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getSecret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    "dev-only-secret-change-me-32-bytes-minimum-please";
  return new TextEncoder().encode(raw);
}

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
}

const DEMO_PASSWORD = "AnchorTag!2026";

const _userCache = new Map<string, SeedUser>();
function ensureSeedUsers(): SeedUser[] {
  if (_userCache.size > 0) return Array.from(_userCache.values());
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const users: SeedUser[] = [
    {
      id: "u-inspector",
      email: "kamata@kamloopsropeaccess.com",
      name: "Justin Kamata",
      role: "inspector",
      passwordHash: hash,
    },
    {
      id: "u-admin",
      email: "admin@kamloopsropeaccess.com",
      name: "S. Chen",
      role: "admin",
      passwordHash: hash,
    },
    {
      id: "u-client",
      email: "client@anchorclient.com",
      name: "Client Viewer",
      role: "client",
      passwordHash: hash,
    },
  ];
  for (const u of users) _userCache.set(u.email.toLowerCase(), u);
  return users;
}

export function findUserByEmail(email: string): SeedUser | null {
  ensureSeedUsers();
  return _userCache.get(email.toLowerCase()) || null;
}

export function findUserById(id: string): SeedUser | null {
  ensureSeedUsers();
  for (const u of _userCache.values()) {
    if (u.id === id) return u;
  }
  return null;
}

export function listUsers(): Array<Pick<SeedUser, "id" | "email" | "name" | "role">> {
  ensureSeedUsers();
  return Array.from(_userCache.values()).map(({ id, email, name, role }) => ({
    id,
    email,
    name,
    role,
  }));
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
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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
