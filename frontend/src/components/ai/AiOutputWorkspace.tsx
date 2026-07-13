import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Expand,
  RefreshCw,
  Save,
  Shrink,
  Sparkles,
} from "lucide-react";

type Props = {
  markdown: string;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onShorten: () => void;
  onExpand: () => void;
  onMakeProfessional: () => void;
  onSave: () => void;
  onNew: () => void;
  busy?: boolean;
};

export function AiOutputWorkspace({
  markdown,
  onChange,
  onRegenerate,
  onShorten,
  onExpand,
  onMakeProfessional,
  onSave,
  onNew,
  busy,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function exportPrep() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uxguard-ai-output.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 bg-ink-50/80 px-4 py-3">
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setEditing((v) => !v)} disabled={busy}>
          {editing ? "Preview" : "Edit"}
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onRegenerate} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onShorten} disabled={busy}>
          <Shrink className="h-3.5 w-3.5" />
          Shorten
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onExpand} disabled={busy}>
          <Expand className="h-3.5 w-3.5" />
          Expand
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onMakeProfessional} disabled={busy}>
          <Sparkles className="h-3.5 w-3.5" />
          More professional
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={onSave} disabled={busy}>
          <Save className="h-3.5 w-3.5" />
          Save
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={copy} disabled={busy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" className="btn-secondary py-1.5 text-xs" onClick={exportPrep} disabled={busy}>
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <button type="button" className="btn-primary ml-auto py-1.5 text-xs" onClick={onNew} disabled={busy}>
          Start new
        </button>
      </div>
      <div className="p-4">
        {editing ? (
          <textarea
            className="input-field min-h-[420px] font-mono text-sm"
            value={markdown}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Edit AI output"
          />
        ) : (
          <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-800">
            {markdown || "No output yet."}
          </pre>
        )}
      </div>
    </div>
  );
}
