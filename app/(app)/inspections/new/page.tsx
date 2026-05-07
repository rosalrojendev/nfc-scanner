import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { InspectionFormClient } from "./inspection-form-client";

export const metadata = { title: "New inspection · Anchor Tag Pro" };
export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can.logInspection(session.role)) redirect("/inspections");
  return (
    <Suspense fallback={null}>
      <InspectionFormClient />
    </Suspense>
  );
}
