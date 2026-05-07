import { AnchorDetailClient } from "./anchor-detail-client";

export const metadata = { title: "Anchor detail · Anchor Tag Pro" };

export default async function AnchorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnchorDetailClient id={id} />;
}
