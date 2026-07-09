import { useEffect, useRef, useState } from "react";
import { Copy, Trash2, Upload } from "lucide-react";
import { ReadOnlyNotice } from "../../components/platform/ReadOnlyNotice";
import { api, resolveAssetUrl } from "../../api/client";
import type { MediaAsset } from "../../types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    api.listMedia().then(setAssets);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadMedia(file);
      }
      refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this file?")) return;
    await api.deleteMedia(id);
    refresh();
  }

  function copyUrl(asset: MediaAsset) {
    const url = asset.url.startsWith("http") ? asset.url : `${window.location.origin}${resolveAssetUrl(asset.url)}`;
    navigator.clipboard.writeText(url);
    setCopied(asset.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <ReadOnlyNotice />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Media Library</h1>
          <p className="mt-1 text-ink-500">Upload images and research report PDFs</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-primary"
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div
          className="card flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-ink-200 p-16 transition hover:border-brand-300 hover:bg-brand-50/20"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload className="h-10 w-10 text-ink-300" />
          <p className="mt-4 font-medium text-ink-700">Drop files or click to upload</p>
          <p className="mt-1 text-sm text-ink-400">Images, PDFs, and Word documents</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="card overflow-hidden">
              <div className="flex aspect-square items-center justify-center bg-ink-50">
                {asset.mime_type.startsWith("image/") ? (
                  <img src={resolveAssetUrl(asset.url)} alt={asset.alt_text || asset.original_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-2xl font-bold uppercase text-brand-600">
                      {asset.mime_type.includes("pdf") ? "PDF" : "DOC"}
                    </p>
                    <p className="mt-2 text-xs text-ink-400">{formatBytes(asset.size_bytes)}</p>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-ink-900">{asset.original_name}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyUrl(asset)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-ink-50 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
                  >
                    <Copy className="h-3 w-3" />
                    {copied === asset.id ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(asset.id)}
                    className="rounded-lg px-2 py-1.5 text-red-500 hover:bg-red-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
