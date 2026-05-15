import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSession } from "@/lib/auth";

const f = createUploadthing();

// All routes are auth-gated: an UploadThingError thrown in middleware
// rejects the upload before bytes leave the client.
async function requireSession() {
  const session = await getSession();
  if (!session) throw new UploadThingError("Unauthorized");
  return { userId: session.id, role: session.role };
}

export const uploadRouter = {
  // Inspection photos — JPEG/PNG/WebP/HEIC, up to 8 MB, multiple per inspection.
  inspectionPhotos: f({
    image: { maxFileSize: "8MB", maxFileCount: 12 },
  })
    .middleware(requireSession)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
      };
    }),

  // Drawing plan images — same image types, larger limit.
  drawingImage: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(requireSession)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        contentType: file.type,
      };
    }),

  // Drawing PDFs.
  drawingPdf: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(requireSession)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        contentType: file.type,
      };
    }),

  // Inspector avatars and signature captures — small images.
  avatarOrSignature: f({
    image: { maxFileSize: "1MB", maxFileCount: 1 },
  })
    .middleware(requireSession)
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
