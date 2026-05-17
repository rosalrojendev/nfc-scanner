import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { TenancyClient } from "./tenancy-client";

export const metadata = { title: "Tenancy · Anchor Tag Pro" };

export const dynamic = "force-dynamic";

export default async function TenancyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can.viewTenancy(session.role)) redirect("/dashboard");
  return <TenancyClient />;
}
