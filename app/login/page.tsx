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
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8 bg-[var(--color-bg)]">
      <Suspense fallback={null}>
        <LoginClient nextPath={params.next || "/dashboard"} />
      </Suspense>
      <footer
        className="text-xs text-[var(--color-text-faint)] text-center"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)",
        }}
      >
        © 2026 Rojen Rosal Dev. All Rights Reserved.
      </footer>
    </div>
  );
}
