import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getProjectContext } from "@/lib/project-context-helpers";
import { TopBar } from "@/components/shell/topbar";
import { SideNav, BottomNav } from "@/components/shell/nav";
import { SessionProvider } from "@/components/shell/session-provider";
import { ProjectProvider } from "@/components/shell/project-provider";
import { GlobalLoader } from "@/components/shell/global-loader";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { clients, projects, currentProjectId, canManageAnyClient } =
    await getProjectContext(session);

  return (
    <SessionProvider user={session}>
      <ProjectProvider
        clients={clients}
        projects={projects}
        initialCurrentProjectId={currentProjectId}
        canManageAnyClient={canManageAnyClient}
      >
        <GlobalLoader />
        <div className="min-h-screen grid lg:grid-cols-[280px_1fr] grid-rows-[auto_1fr]">
          <div className="lg:col-span-2">
            <TopBar user={session} />
          </div>
          <SideNav />
          <main
            id="main"
            className="px-4 lg:px-8 pt-5 lg:pt-8 grid gap-5 lg:gap-6 content-start w-full max-w-[1140px] mx-auto"
            style={{
              paddingBottom: "calc(104px + env(safe-area-inset-bottom))",
            }}
          >
            {children}
          </main>
          <BottomNav />
        </div>
      </ProjectProvider>
    </SessionProvider>
  );
}
