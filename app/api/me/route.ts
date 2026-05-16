import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  getSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  emailAlreadyUsed,
  getUserPasswordHash,
  getUserPrefs,
  updateUserPrefs,
  updateUserProfile,
} from "@/lib/server-store";

export const runtime = "nodejs";

const patchSchema = z.object({
  // Avatar + reminder toggles
  avatarUrl: z.string().url().nullable().optional(),
  reminderSixtyDay: z.boolean().optional(),
  reminderThirtyDay: z.boolean().optional(),
  reminderSevenDay: z.boolean().optional(),
  // Profile
  name: z.string().min(2, "Name must be at least 2 characters.").max(120).optional(),
  email: z.string().email("Enter a valid email address.").optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .max(128)
    .optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getUserPrefs(session.id);
  if (!prefs) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    userId: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    prefs,
  });
}

export async function PATCH(req: Request) {
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // --- Profile changes (name / email / password) require extra validation
  const profilePatch: Parameters<typeof updateUserProfile>[1] = {};
  if (data.name !== undefined) profilePatch.name = data.name;
  if (data.email !== undefined) {
    if (await emailAlreadyUsed(data.email, session.id)) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    profilePatch.email = data.email;
  }
  if (data.newPassword !== undefined) {
    if (!data.currentPassword) {
      return NextResponse.json(
        { error: "Enter your current password to change it." },
        { status: 400 },
      );
    }
    const hash = await getUserPasswordHash(session.id);
    if (!hash || !(await verifyPassword(data.currentPassword, hash))) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }
    profilePatch.passwordHash = bcrypt.hashSync(data.newPassword, 10);
  }

  let nextProfile = {
    id: session.id,
    email: session.email,
    name: session.name,
  };
  if (Object.keys(profilePatch).length > 0) {
    nextProfile = await updateUserProfile(session.id, profilePatch);
    // Re-issue the JWT so the client sees the new name/email immediately
    // without requiring a re-login.
    await setSessionCookie({
      id: nextProfile.id,
      email: nextProfile.email,
      name: nextProfile.name,
      role: session.role,
    });
  }

  // --- Prefs (avatar + reminders)
  const prefsPatch: Parameters<typeof updateUserPrefs>[1] = {};
  if (data.avatarUrl !== undefined) prefsPatch.avatarUrl = data.avatarUrl;
  if (data.reminderSixtyDay !== undefined)
    prefsPatch.reminderSixtyDay = data.reminderSixtyDay;
  if (data.reminderThirtyDay !== undefined)
    prefsPatch.reminderThirtyDay = data.reminderThirtyDay;
  if (data.reminderSevenDay !== undefined)
    prefsPatch.reminderSevenDay = data.reminderSevenDay;
  let prefs = await getUserPrefs(session.id);
  if (Object.keys(prefsPatch).length > 0) {
    prefs = await updateUserPrefs(session.id, prefsPatch);
  }

  return NextResponse.json({
    userId: nextProfile.id,
    email: nextProfile.email,
    name: nextProfile.name,
    role: session.role,
    prefs,
  });
}
