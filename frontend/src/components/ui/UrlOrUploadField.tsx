import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { api, resolveAssetUrl } from "../../api/client";

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
};

export function UrlOrUploadField({
  label,
  value,
  onChange,
  placeholder = "https://... or upload from your device",
  accept = "image/*,.pdf,.doc,.docx",
  required,
  hasError,
  inputRef,
  helpText,
  showPreview = true,
}: UrlOrUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const asset = await api.uploadMedia(file);
      onChange(asset.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const previewUrl = value ? resolveAssetUrl(value) : "";
  const isImage =
    showPreview &&
    Boolean(previewUrl) &&
    (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(previewUrl) ||
      previewUrl.includes("/api/v1/media/file/"));

  return (
    <div>
      <label className={hasError ? "label-field label-field-error" : "label-field"}>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={(el) => {
            inputRef?.(el);
          }}
          type="url"
          className={hasError ? "input-field input-field-error flex-1" : "input-field flex-1"}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setUploadError("");
          }}
          placeholder={placeholder}
        />
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
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
              Upload
            </>
          )}
        </button>
      </div>
      {helpText ? <p className="mt-1 text-xs text-ink-400">{helpText}</p> : null}
      {uploadError ? <p className="mt-1 text-xs text-red-600">{uploadError}</p> : null}
      {isImage ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-ink-100 bg-ink-50">
          <img src={previewUrl} alt="" className="max-h-40 w-full object-cover" />
        </div>
      ) : value && showPreview && !isImage ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-ink-500">
          <ImagePlus className="h-3.5 w-3.5" />
          File linked
        </p>
      ) : null}
    </div>
  );
}
