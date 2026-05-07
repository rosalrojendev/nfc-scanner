import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/shell/topbar";
import { SideNav, BottomNav } from "@/components/shell/nav";
import { SessionProvider } from "@/components/shell/session-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider user={session}>
      <div className="min-h-screen grid lg:grid-cols-[280px_1fr] grid-rows-[auto_1fr]">
        <div className="lg:col-span-2">
          <TopBar user={session} />
        </div>
        <SideNav />
        <main
          id="main"
          className="px-4 lg:px-6 pt-4 lg:pt-6 grid gap-4 content-start"
          style={{
            paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </SessionProvider>
  );
}
