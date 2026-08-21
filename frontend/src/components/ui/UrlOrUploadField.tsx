import { DragEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { api, ApiError, resolveAssetUrl } from "../../api/client";
import {
  COVER_HELP_TEXT,
  validateCoverImageFile,
  validateCoverImageUrl,
} from "../../lib/coverImage";

type UrlOrUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
  required?: boolean;
  hasError?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  helpText?: string;
  showPreview?: boolean;
  variant?: "default" | "cover";
  /** Passed to media upload so profile fields can be attached atomically. */
  uploadPurpose?: "cover" | "media" | "avatar" | "cv";
  /** Show a Remove control that commits an empty value. */
  allowRemove?: boolean;
  onValidationError?: (message: string) => void;
  /** Called after a successful upload or validated URL blur (cover edits). */
  onCommit?: (url: string) => void;
};

export function UrlOrUploadField({
  label,
  value,
  onChange,
  placeholder = "https://images.example.com/photo.jpg",
  accept = "image/*,.pdf,.doc,.docx",
  required,
  hasError,
  inputRef,
  helpText,
  showPreview = true,
  variant = "default",
  uploadPurpose,
  allowRemove = false,
  onValidationError,
  onCommit,
}: UrlOrUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState("");
  const [remoteBroken, setRemoteBroken] = useState(false);

  const isCover = variant === "cover";
  const purpose = uploadPurpose || (isCover ? "cover" : "media");
  const canRemove = allowRemove || isCover;

  useEffect(() => {
    setRemoteBroken(false);
  }, [value, localPreview]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function validateCoverUrl(url: string): Promise<boolean> {
    if (!isCover || !url.trim()) return true;
    const dimensionError = await validateCoverImageUrl(url);
    if (dimensionError) {
      setUploadError(dimensionError);
      onValidationError?.(dimensionError);
      return false;
    }
    setUploadError("");
    return true;
  }

  async function commitUrl(url: string) {
    if (!(await validateCoverUrl(url))) return;
    onCommit?.(url);
  }

  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    setRemoteBroken(false);

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    try {
      if (isCover) {
        const validationError = await validateCoverImageFile(file);
        if (validationError) {
          setUploadError(validationError);
          onValidationError?.(validationError);
          setLocalPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return "";
          });
          return;
        }
      }

      const asset = await api.uploadMedia(file, { purpose });
      if (!asset?.url) {
        throw new Error("Upload finished but no image URL was returned. Try again.");
      }
      onChange(asset.url);
      setUploadError("");
      onCommit?.(asset.url);
      // Keep local preview briefly until remote media URL is warm.
      window.setTimeout(() => {
        setLocalPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return "";
        });
      }, 2500);
    } catch (err) {
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      const message =
        err instanceof ApiError && err.status === 401
          ? "Session expired. Sign out and sign back in, then upload again."
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
      setUploadError(message);
      onValidationError?.(message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleUpload(e.dataTransfer.files);
  }

  const remoteUrl = value ? resolveAssetUrl(value) : "";
  const previewUrl = localPreview || remoteUrl;
  const isImage =
    showPreview &&
    Boolean(previewUrl) &&
    (Boolean(localPreview) ||
      /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(previewUrl) ||
      previewUrl.includes("/api/v1/media/file/") ||
      previewUrl.startsWith("blob:"));

  return (
    <div>
      <label className={hasError ? "label-field label-field-error" : "label-field"}>
        {label}
        {required ? " *" : ""}
      </label>

      {isCover ? (
        <div
          className={`relative mb-3 overflow-hidden rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-brand-400 bg-brand-50/40"
              : hasError || uploadError
                ? "border-red-300 bg-danger-50/30"
                : "border-ink-200 bg-ink-50/50 hover:border-brand-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !uploading && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          {isImage && !remoteBroken ? (
            <>
              <img
                key={previewUrl}
                src={previewUrl}
                alt=""
                className="aspect-[16/10] w-full object-cover"
                onError={() => {
                  if (!localPreview) setRemoteBroken(true);
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 text-center">
                <p className="text-xs font-medium text-white">Click or drop to replace cover image</p>
              </div>
            </>
          ) : (
            <div className="flex aspect-[16/10] flex-col items-center justify-center px-6 text-center">
              <ImagePlus className="h-10 w-10 text-ink-300" />
              <p className="mt-3 text-sm font-medium text-ink-700">
                {remoteBroken
                  ? "Image uploaded but preview failed to load — try re-uploading"
                  : "Drop cover image here or click to upload"}
              </p>
              <p className="mt-1 text-xs text-ink-400">{COVER_HELP_TEXT}</p>
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-100/80">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={(el) => {
            inputRef?.(el);
          }}
          type="text"
          inputMode="url"
          className={hasError || uploadError ? "input-field input-field-error flex-1" : "input-field flex-1"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setUploadError("");
            setRemoteBroken(false);
          }}
          onBlur={() => {
            if (!value.trim()) return;
            if (isCover) void commitUrl(value);
            else onCommit?.(value.trim());
          }}
          placeholder={placeholder}
        />
        <input
          ref={fileRef}
          type="file"
          accept={isCover ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" : accept}
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-secondary shrink-0 whitespace-nowrap py-2.5"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {isCover ? "Replace" : "Upload"}
            </>
          )}
        </button>
        {canRemove && value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setUploadError("");
              setRemoteBroken(false);
              setLocalPreview((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return "";
              });
              onCommit?.("");
            }}
            className="btn-secondary shrink-0 whitespace-nowrap py-2.5 text-danger-500"
          >
            Remove
          </button>
        ) : null}
      </div>

      <p className="mt-1 text-xs text-ink-400">{helpText || (isCover ? COVER_HELP_TEXT : null)}</p>
      {uploadError ? <p className="mt-1 text-sm font-medium text-danger-500">{uploadError}</p> : null}
      {remoteBroken && !uploadError ? (
        <p className="mt-1 text-sm font-medium text-amber-700">
          Preview could not load. The file may still be processing — wait a moment or upload again.
        </p>
      ) : null}

      {!isCover && isImage && !remoteBroken ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
          <img
            src={previewUrl}
            alt=""
            className="max-h-40 w-full object-cover"
            onError={() => {
              if (!localPreview) setRemoteBroken(true);
            }}
          />
        </div>
      ) : null}
      {!isCover && value && showPreview && !isImage ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500">
          <ImagePlus className="h-3.5 w-3.5" />
          File linked
        </p>
      ) : null}
    </div>
  );
}
