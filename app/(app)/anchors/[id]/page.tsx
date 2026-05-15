import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessProject, getAnchor } from "@/lib/server-store";
import { AnchorDetailClient } from "./anchor-detail-client";

export const metadata = { title: "Anchor detail · Anchor Tag Pro" };

export default async function AnchorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) notFound();
  const anchor = await getAnchor(id);
  if (!anchor || !(await canAccessProject(session, anchor.projectId))) {
    notFound();
  }
  return <AnchorDetailClient id={id} />;
}
