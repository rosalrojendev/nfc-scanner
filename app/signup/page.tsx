import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Create account · Anchor Tag Pro",
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-stretch justify-center px-4 py-8 sm:items-center bg-[var(--color-bg)]">
      <SignupClient />
    </div>
  );
}
