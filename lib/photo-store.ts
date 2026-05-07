import "server-only";

interface StoredPhoto {
  contentType: string;
  data: Buffer;
  uploadedAt: number;
  uploadedBy: string;
}

declare global {
  var __atpPhotoStore: Map<string, StoredPhoto> | undefined;
}

const store: Map<string, StoredPhoto> =
  globalThis.__atpPhotoStore ?? new Map();
globalThis.__atpPhotoStore = store;

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function putPhoto(opts: {
  contentType: string;
  data: Buffer;
  uploadedBy: string;
}): string {
  const id = randomId();
  store.set(id, {
    contentType: opts.contentType,
    data: opts.data,
    uploadedAt: Date.now(),
    uploadedBy: opts.uploadedBy,
  });
  return id;
}

export function getPhoto(id: string): StoredPhoto | null {
  return store.get(id) ?? null;
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
