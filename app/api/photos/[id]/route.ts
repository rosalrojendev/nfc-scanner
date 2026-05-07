import { getPhoto } from "@/lib/photo-store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9]{32}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const photo = getPhoto(id);
  if (!photo) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(photo.data), {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.data.byteLength),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
