import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign in · Anchor Tag Pro",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const params = (await searchParams) || {};
  if (session) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/dashboard");
  }

  return (
    <div className="min-h-screen flex items-stretch justify-center px-4 py-8 sm:items-center bg-[var(--color-bg)]">
      <Suspense fallback={null}>
        <LoginClient nextPath={params.next || "/dashboard"} />
      </Suspense>
    </div>
  );
}
