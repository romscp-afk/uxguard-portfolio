/** Compress an image File/Blob to at most maxBytes (default 500 KB). */
export async function compressImageForChat(
  file: File,
  {
    maxBytes = 500 * 1024,
    maxDimension = 1600,
    mimeType = "image/jpeg",
  }: { maxBytes?: number; maxDimension?: number; mimeType?: string } = {},
): Promise<{ file: File; width: number; height: number; compressed: boolean }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be shared in chat.");
  }

  // Animated GIFs: keep as-is only if already under the limit.
  if (file.type === "image/gif") {
    if (file.size <= maxBytes) {
      return { file, width: 0, height: 0, compressed: false };
    }
    throw new Error("GIF is larger than 500 KB. Please use JPG/PNG/WebP instead.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");

  let quality = 0.85;
  let blob: Blob | null = null;
  let compressed = file.size > maxBytes || scale < 1;

  for (let attempt = 0; attempt < 12; attempt++) {
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), mimeType, quality),
    );
    if (!blob) throw new Error("Could not compress image.");
    if (blob.size <= maxBytes) break;
    compressed = true;
    if (quality > 0.45) {
      quality -= 0.1;
    } else {
      width = Math.max(320, Math.round(width * 0.85));
      height = Math.max(320, Math.round(height * 0.85));
      quality = Math.max(0.4, quality);
    }
  }

  bitmap.close();
  if (!blob || blob.size > maxBytes) {
    throw new Error("Could not compress this image under 500 KB. Try a smaller screenshot.");
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "chat-image";
  const next = new File([blob], `${base}.jpg`, { type: mimeType, lastModified: Date.now() });
  return { file: next, width, height, compressed };
}
