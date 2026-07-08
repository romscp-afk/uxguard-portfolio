/** Case study cover: 16:10 (recommended 1200×750). */
export const COVER_SPECS = {
  recommendedWidth: 1200,
  recommendedHeight: 750,
  minWidth: 960,
  minHeight: 600,
  aspectRatio: 16 / 10,
  aspectTolerance: 0.08,
  maxBytes: 5 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const COVER_HELP_TEXT =
  "Recommended 1200×750 px (16:10). Minimum 960×600. Max 5 MB. JPG, PNG, or WebP.";

function formatSizeError(width: number, height: number): string {
  return `Cover image must be at least ${COVER_SPECS.minWidth}×${COVER_SPECS.minHeight} px (16:10). Yours is ${width}×${height} px.`;
}

function formatAspectError(width: number, height: number): string {
  return `Cover image should be 16:10 aspect ratio (e.g. 1200×750). Yours is ${width}×${height}.`;
}

export function validateCoverDimensions(width: number, height: number): string | null {
  if (width < COVER_SPECS.minWidth || height < COVER_SPECS.minHeight) {
    return formatSizeError(width, height);
  }
  const ratio = width / height;
  const target = COVER_SPECS.aspectRatio;
  if (Math.abs(ratio - target) / target > COVER_SPECS.aspectTolerance) {
    return formatAspectError(width, height);
  }
  return null;
}

export function validateCoverFileType(mimeType: string): string | null {
  if (!COVER_SPECS.allowedTypes.includes(mimeType as (typeof COVER_SPECS.allowedTypes)[number])) {
    return "Cover image must be JPG, PNG, or WebP.";
  }
  return null;
}

export function validateCoverFileSize(bytes: number): string | null {
  if (bytes > COVER_SPECS.maxBytes) {
    return "Cover image must be 5 MB or smaller.";
  }
  return null;
}

export function loadImageDimensions(
  source: string | File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = source instanceof File ? URL.createObjectURL(source) : source;

    img.onload = () => {
      if (source instanceof File) URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (source instanceof File) URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export async function validateCoverImageFile(file: File): Promise<string | null> {
  const typeError = validateCoverFileType(file.type);
  if (typeError) return typeError;

  const sizeError = validateCoverFileSize(file.size);
  if (sizeError) return sizeError;

  try {
    const { width, height } = await loadImageDimensions(file);
    return validateCoverDimensions(width, height);
  } catch {
    return "Could not read image. Try another file.";
  }
}

export async function validateCoverImageUrl(url: string): Promise<string | null> {
  if (!url.trim()) return "Cover image is required to publish.";
  if (url.includes("/api/v1/media/file/")) return null;

  try {
    const { width, height } = await loadImageDimensions(resolveAssetUrlForValidation(url));
    return validateCoverDimensions(width, height);
  } catch {
    return null;
  }
}

function resolveAssetUrlForValidation(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const root = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${root}${url}`;
}
