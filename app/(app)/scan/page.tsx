import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ScanClient } from "./scan-client";

export const metadata = { title: "Scan · Anchor Tag Pro" };
export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can.scan(session.role)) redirect("/dashboard");
  return <ScanClient />;
}
