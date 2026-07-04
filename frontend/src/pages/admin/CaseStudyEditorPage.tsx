import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import type { CaseStudy, ContentBlock, MetricItem } from "../../types";

const RESEARCH_METHODS = [
  "Usability Testing",
  "User Interviews",
  "Discovery Interviews",
  "Diary Study",
  "Survey",
  "Card Sorting",
  "Tree Testing",
  "A/B Testing",
  "Analytics Review",
  "Stakeholder Interviews",
  "Concept Testing",
  "Unmoderated Testing",
];

const BLOCK_TYPES = [
  { type: "text", label: "Text Section" },
  { type: "quote", label: "User Quote" },
  { type: "findings", label: "Findings" },
  { type: "gallery", label: "Image Gallery" },
  { type: "image", label: "Single Image" },
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const emptyStudy: Partial<CaseStudy> = {
  title: "",
  subtitle: "",
  client: "",
  project_type: "",
  role: "",
  duration: "",
  summary: "",
  challenge: "",
  methodology: "",
  impact: "",
  reflections: "",
  cover_image: "",
  methods: [],
  metrics: [],
  content_blocks: [],
  status: "draft",
  featured: false,
  sort_order: 0,
};

export function CaseStudyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();

  const [form, setForm] = useState<Partial<CaseStudy>>(emptyStudy);
  const [methodsInput, setMethodsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isNew && id) {
      api.adminGetCaseStudy(Number(id)).then((cs) => {
        setForm(cs);
        setMethodsInput(cs.methods.join(", "));
      });
    }
  }, [id, isNew]);

  function updateField<K extends keyof CaseStudy>(key: K, value: CaseStudy[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addMetric() {
    updateField("metrics", [...(form.metrics || []), { label: "", value: "", description: "" }]);
  }

  function updateMetric(index: number, field: keyof MetricItem, value: string) {
    const metrics = [...(form.metrics || [])];
    metrics[index] = { ...metrics[index], [field]: value };
    updateField("metrics", metrics);
  }

  function removeMetric(index: number) {
    updateField("metrics", (form.metrics || []).filter((_, i) => i !== index));
  }

  function addBlock(type: ContentBlock["type"]) {
    const defaults: Record<string, Record<string, unknown>> = {
      text: { heading: "", body: "" },
      quote: { text: "", attribution: "" },
      findings: { items: [{ statement: "", evidence: "" }] },
      gallery: { images: [{ url: "", caption: "" }] },
      image: { url: "", caption: "" },
    };
    const block: ContentBlock = { id: uid(), type, data: defaults[type] || {} };
    updateField("content_blocks", [...(form.content_blocks || []), block]);
  }

  function updateBlock(index: number, data: Record<string, unknown>) {
    const blocks = [...(form.content_blocks || [])];
    blocks[index] = { ...blocks[index], data: { ...blocks[index].data, ...data } };
    updateField("content_blocks", blocks);
  }

  function removeBlock(index: number) {
    updateField("content_blocks", (form.content_blocks || []).filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const methods = methodsInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const payload = { ...form, methods };

    try {
      if (isNew) {
        const created = await api.createCaseStudy(payload);
        navigate(`/admin/case-studies/${created.id}`, { replace: true });
        setMessage("Case study created.");
      } else {
        await api.updateCaseStudy(Number(id), payload);
        setMessage("Saved successfully.");
      }
    } catch {
      setMessage("Failed to save. Check required fields.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    if (!confirm("Delete this case study permanently?")) return;
    await api.deleteCaseStudy(Number(id));
    navigate("/admin/case-studies");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/case-studies" className="text-ink-400 hover:text-ink-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-950">
              {isNew ? "New Case Study" : "Edit Case Study"}
            </h1>
            <p className="text-sm text-ink-500">Structure: Problem → Method → Artifacts → Impact</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew ? (
            <button type="button" onClick={handleDelete} className="btn-secondary text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          <button type="submit" form="case-study-form" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <form id="case-study-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Project Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label-field">Title *</label>
                <input
                  className="input-field"
                  value={form.title || ""}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Subtitle</label>
                <input
                  className="input-field"
                  value={form.subtitle || ""}
                  onChange={(e) => updateField("subtitle", e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Client</label>
                <input
                  className="input-field"
                  value={form.client || ""}
                  onChange={(e) => updateField("client", e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Project Type</label>
                <input
                  className="input-field"
                  value={form.project_type || ""}
                  onChange={(e) => updateField("project_type", e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Your Role</label>
                <input
                  className="input-field"
                  value={form.role || ""}
                  onChange={(e) => updateField("role", e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Duration</label>
                <input
                  className="input-field"
                  value={form.duration || ""}
                  onChange={(e) => updateField("duration", e.target.value)}
                  placeholder="e.g. 6 weeks"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Cover Image URL</label>
                <input
                  className="input-field"
                  value={form.cover_image || ""}
                  onChange={(e) => updateField("cover_image", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field">Summary</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={form.summary || ""}
                  onChange={(e) => updateField("summary", e.target.value)}
                />
              </div>
            </div>
          </section>

          {(["challenge", "methodology", "impact", "reflections"] as const).map((field) => (
            <section key={field} className="card p-6">
              <h2 className="mb-4 font-semibold capitalize text-ink-900">{field}</h2>
              <textarea
                className="input-field min-h-[120px]"
                value={form[field] || ""}
                onChange={(e) => updateField(field, e.target.value)}
              />
            </section>
          ))}

          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Content Blocks</h2>
              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {(form.content_blocks || []).map((block, index) => (
                <div key={block.id} className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                      {block.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  {block.type === "text" ? (
                    <div className="space-y-2">
                      <input
                        className="input-field"
                        placeholder="Heading"
                        value={String(block.data.heading || "")}
                        onChange={(e) => updateBlock(index, { heading: e.target.value })}
                      />
                      <textarea
                        className="input-field min-h-[80px]"
                        placeholder="Body text"
                        value={String(block.data.body || "")}
                        onChange={(e) => updateBlock(index, { body: e.target.value })}
                      />
                    </div>
                  ) : null}

                  {block.type === "quote" ? (
                    <div className="space-y-2">
                      <textarea
                        className="input-field"
                        placeholder="Quote text"
                        value={String(block.data.text || "")}
                        onChange={(e) => updateBlock(index, { text: e.target.value })}
                      />
                      <input
                        className="input-field"
                        placeholder="Attribution"
                        value={String(block.data.attribution || "")}
                        onChange={(e) => updateBlock(index, { attribution: e.target.value })}
                      />
                    </div>
                  ) : null}

                  {block.type === "image" ? (
                    <div className="space-y-2">
                      <input
                        className="input-field"
                        placeholder="Image URL"
                        value={String(block.data.url || "")}
                        onChange={(e) => updateBlock(index, { url: e.target.value })}
                      />
                      <input
                        className="input-field"
                        placeholder="Caption"
                        value={String(block.data.caption || "")}
                        onChange={(e) => updateBlock(index, { caption: e.target.value })}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Publish</h2>
            <div className="space-y-4">
              <div>
                <label className="label-field">Status</label>
                <select
                  className="input-field"
                  value={form.status || "draft"}
                  onChange={(e) => updateField("status", e.target.value as CaseStudy["status"])}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured || false}
                  onChange={(e) => updateField("featured", e.target.checked)}
                  className="rounded border-ink-300"
                />
                Featured on homepage
              </label>
              <div>
                <label className="label-field">Sort Order</label>
                <input
                  type="number"
                  className="input-field"
                  value={form.sort_order ?? 0}
                  onChange={(e) => updateField("sort_order", Number(e.target.value))}
                />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Research Methods</h2>
            <input
              className="input-field"
              value={methodsInput}
              onChange={(e) => setMethodsInput(e.target.value)}
              placeholder="Comma-separated methods"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RESEARCH_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setMethodsInput((prev) => (prev ? `${prev}, ${m}` : m))
                  }
                  className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                >
                  + {m}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Impact Metrics</h2>
              <button type="button" onClick={addMetric} className="text-sm text-brand-600">
                <Plus className="inline h-4 w-4" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {(form.metrics || []).map((metric, i) => (
                <div key={i} className="rounded-lg border border-ink-100 p-3">
                  <input
                    className="input-field mb-2"
                    placeholder="Value (e.g. +22%)"
                    value={metric.value}
                    onChange={(e) => updateMetric(i, "value", e.target.value)}
                  />
                  <input
                    className="input-field mb-2"
                    placeholder="Label"
                    value={metric.label}
                    onChange={(e) => updateMetric(i, "label", e.target.value)}
                  />
                  <button type="button" onClick={() => removeMetric(i)} className="text-xs text-red-500">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
