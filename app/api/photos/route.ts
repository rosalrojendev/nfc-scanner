import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_BYTES,
  putPhoto,
} from "@/lib/photo-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!PHOTO_ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or HEIC images are allowed." },
      { status: 415 },
    );
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo exceeds 5 MB limit." },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const id = putPhoto({
    contentType: file.type,
    data: buf,
    uploadedBy: session.id,
  });

  return NextResponse.json({
    id,
    url: `/api/photos/${id}`,
    bytes: buf.byteLength,
    contentType: file.type,
  });
}
