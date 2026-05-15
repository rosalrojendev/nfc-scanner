import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, setSessionCookie } from "@/lib/auth";

const demoSchema = z.object({
  role: z.enum(["inspector", "admin", "client"]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = demoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const { role } = parsed.data;

  const emailByRole = {
    inspector: "kamata@kamloopsropeaccess.com",
    admin: "admin@kamloopsropeaccess.com",
    client: "client@anchorclient.com",
  } as const;

  const user = await findUserByEmail(emailByRole[role]);
  if (!user) {
    return NextResponse.json(
      { error: "Demo user is unavailable." },
      { status: 500 },
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
