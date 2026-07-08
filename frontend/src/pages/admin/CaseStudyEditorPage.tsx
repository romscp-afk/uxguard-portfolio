import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, FileText, Plus, Save, Trash2, Upload } from "lucide-react";
import { UrlOrUploadField } from "../../components/ui/UrlOrUploadField";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError } from "../../api/client";
import {
  getCaseStudyFromCache,
  removeCaseStudyFromCache,
  saveCaseStudyToCache,
  syncCachedCaseStudies,
} from "../../lib/caseStudyStore";
import { COVER_HELP_TEXT, validateCoverImageUrl } from "../../lib/coverImage";
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

type FieldKey =
  | "title"
  | "summary"
  | "cover_image"
  | "challenge"
  | "methodology"
  | "impact"
  | "methods";

function validateForm(
  form: Partial<CaseStudy>,
  methodsInput: string,
  publish: boolean,
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (!form.title?.trim()) {
    errors.title = "Title is required.";
  }

  if (publish) {
    if (!form.summary?.trim()) errors.summary = "Summary is required to publish.";
    if (!form.cover_image?.trim()) errors.cover_image = "Cover image is required to publish.";
    if (!form.challenge?.trim()) errors.challenge = "Challenge is required to publish.";
    if (!form.methodology?.trim()) errors.methodology = "Methodology is required to publish.";
    if (!form.impact?.trim()) errors.impact = "Impact is required to publish.";
    const methods = methodsInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    if (methods.length === 0) errors.methods = "Add at least one research method to publish.";
  }

  return errors;
}

function fieldInputClass(hasError: boolean) {
  return hasError ? "input-field input-field-error" : "input-field";
}

function fieldLabelClass(hasError: boolean) {
  return hasError ? "label-field label-field-error" : "label-field";
}

function parseStudyId(raw: string | undefined): number | null {
  if (!raw || raw === "new" || !/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export function CaseStudyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const studyId = parseStudyId(id);
  const isNew = studyId == null;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<Partial<CaseStudy>>(emptyStudy);
  const [methodsInput, setMethodsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});

  useEffect(() => {
    if (studyId == null) return;
    api
      .adminGetCaseStudy(studyId)
      .then((cs) => {
        setForm(cs);
        setMethodsInput(cs.methods.join(", "));
        saveCaseStudyToCache(cs);
      })
      .catch(() => {
        const cached = getCaseStudyFromCache(studyId);
        if (cached) {
          setForm(cached);
          setMethodsInput(cached.methods.join(", "));
        }
      });
  }, [studyId]);

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function showValidationErrors(errors: Partial<Record<FieldKey, string>>) {
    setFieldErrors(errors);
    setMessageType("error");
    const count = Object.keys(errors).length;
    setMessage(`Please fix ${count} required field${count === 1 ? "" : "s"} highlighted below.`);

    const firstKey = Object.keys(errors)[0] as FieldKey | undefined;
    const firstEl = firstKey ? fieldRefs.current[firstKey] : null;
    firstEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    firstEl?.focus();
  }

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

  function updateGalleryImage(blockIndex: number, imageIndex: number, patch: { url?: string; caption?: string }) {
    const block = (form.content_blocks || [])[blockIndex];
    if (!block || block.type !== "gallery") return;
    const images = [...((block.data.images as Array<{ url: string; caption?: string }>) || [])];
    images[imageIndex] = { ...images[imageIndex], ...patch };
    updateBlock(blockIndex, { images });
  }

  function addGalleryImage(blockIndex: number) {
    const block = (form.content_blocks || [])[blockIndex];
    if (!block || block.type !== "gallery") return;
    const images = [...((block.data.images as Array<{ url: string; caption?: string }>) || [])];
    images.push({ url: "", caption: "" });
    updateBlock(blockIndex, { images });
  }

  function removeGalleryImage(blockIndex: number, imageIndex: number) {
    const block = (form.content_blocks || [])[blockIndex];
    if (!block || block.type !== "gallery") return;
    const images = ((block.data.images as Array<{ url: string; caption?: string }>) || []).filter(
      (_, i) => i !== imageIndex,
    );
    updateBlock(blockIndex, { images: images.length ? images : [{ url: "", caption: "" }] });
  }

  async function handleAttachmentUpload(files: FileList | null) {
    if (!files?.[0] || studyId == null) return;
    setUploadingAttachment(true);
    try {
      const file = files[0];
      const asset = await api.uploadMedia(file);
      const attachment = await api.addAttachment(studyId, {
        title: file.name.replace(/\.[^.]+$/, "") || "Research report",
        file_url: asset.url,
        file_type: asset.mime_type,
        size_bytes: asset.size_bytes,
      });
      updateField("attachments", [...(form.attachments || []), attachment]);
      setMessage("Attachment added.");
      setMessageType("success");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof ApiError ? err.message : "Failed to upload attachment.");
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    if (!confirm("Remove this attachment?")) return;
    try {
      await api.deleteAttachment(attachmentId);
      updateField(
        "attachments",
        (form.attachments || []).filter((item) => item.id !== attachmentId),
      );
    } catch {
      setMessageType("error");
      setMessage("Failed to remove attachment.");
    }
  }

  function buildStudyPayload(status: CaseStudy["status"]): Partial<CaseStudy> {
    const methods = methodsInput
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const {
      id: _id,
      slug: _slug,
      author_id: _authorId,
      created_at: _createdAt,
      updated_at: _updatedAt,
      published_at: _publishedAt,
      attachments: _attachments,
      ...rest
    } = form;

    return {
      ...rest,
      methods,
      status,
    };
  }

  async function runValidation(publish: boolean): Promise<Partial<Record<FieldKey, string>>> {
    const errors = validateForm(form, methodsInput, publish);
    if (form.cover_image?.trim()) {
      const coverError = await validateCoverImageUrl(form.cover_image);
      if (coverError) errors.cover_image = coverError;
    } else if (publish) {
      errors.cover_image = errors.cover_image || "Cover image is required to publish.";
    }
    return errors;
  }

  async function persistDraftQuietly(nextCoverUrl?: string) {
    if (isNew || studyId == null) return;
    const payload = buildStudyPayload(form.status === "published" ? "published" : "draft");
    if (nextCoverUrl !== undefined) payload.cover_image = nextCoverUrl || undefined;
    try {
      const updated = await api.updateCaseStudy(studyId, payload);
      const coverImage =
        nextCoverUrl !== undefined ? nextCoverUrl || undefined : updated.cover_image;
      const merged = { ...updated, cover_image: coverImage };
      saveCaseStudyToCache(merged);
      setForm((prev) => ({ ...prev, ...merged }));
    } catch {
      const cached = buildCachedStudy(form.status === "published" ? "published" : "draft");
      if (cached) {
        if (nextCoverUrl !== undefined) cached.cover_image = nextCoverUrl || undefined;
        saveCaseStudyToCache(cached);
        setForm((prev) => ({
          ...prev,
          cover_image: nextCoverUrl !== undefined ? nextCoverUrl : prev.cover_image,
        }));
      }
    }
  }

  function buildCachedStudy(status: CaseStudy["status"]): CaseStudy | null {
    if (studyId == null || !user) return null;
    const payload = buildStudyPayload(status);
    const existing = getCaseStudyFromCache(studyId);
    const now = new Date().toISOString();

    return {
      id: studyId,
      slug: existing?.slug || payload.title?.toLowerCase().replace(/\s+/g, "-") || `study-${studyId}`,
      title: payload.title || "Untitled",
      subtitle: payload.subtitle,
      client: payload.client,
      project_type: payload.project_type,
      role: payload.role,
      duration: payload.duration,
      summary: payload.summary,
      challenge: payload.challenge,
      methodology: payload.methodology,
      impact: payload.impact,
      reflections: payload.reflections,
      cover_image: payload.cover_image,
      methods: payload.methods || [],
      metrics: payload.metrics || [],
      content_blocks: payload.content_blocks || [],
      status,
      featured: payload.featured ?? false,
      sort_order: payload.sort_order ?? 0,
      author_id: user.id,
      created_at: existing?.created_at || form.created_at || now,
      updated_at: now,
      published_at:
        status === "published" ? existing?.published_at || now : status === "draft" ? undefined : existing?.published_at,
      attachments: existing?.attachments || form.attachments || [],
    };
  }

  async function handleSubmit(e: FormEvent, publish = false) {
    e.preventDefault();
    setMessage("");
    setFieldErrors({});

    const validationErrors = await runValidation(publish);
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }

    setSaving(true);
    const status: CaseStudy["status"] = publish
      ? "published"
      : form.status === "published"
        ? "published"
        : "draft";

    const payload = buildStudyPayload(status);

    try {
      if (isNew) {
        const created = await api.createCaseStudy(payload);
        saveCaseStudyToCache(created);
        if (user) {
          try {
            await syncCachedCaseStudies(user.id);
          } catch {
            // Sync is optional when using alternate backends.
          }
        }
        navigate(`/admin/case-studies/${created.id}`, { replace: true });
        setMessageType("success");
        setMessage(publish ? "Published successfully." : "Draft saved.");
      } else {
        const updated = await api.updateCaseStudy(studyId, payload);
        if (updated.id !== studyId) {
          removeCaseStudyFromCache(studyId);
          navigate(`/admin/case-studies/${updated.id}`, { replace: true });
        }
        const merged = {
          ...updated,
          cover_image: payload.cover_image ?? updated.cover_image,
        };
        saveCaseStudyToCache(merged);
        if (user) {
          try {
            await syncCachedCaseStudies(user.id);
          } catch {
            // Sync is optional when using alternate backends.
          }
        }
        setForm(merged);
        setMethodsInput(updated.methods.join(", "));
        setMessageType("success");
        setMessage(publish ? "Published successfully." : "Draft saved.");
      }
    } catch (err) {
      setMessageType("error");
      if (err instanceof ApiError) {
        setMessage(err.message || "Failed to save. Please try again.");
      } else {
        setMessage("Failed to save. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (isNew || studyId == null) {
      setMessageType("error");
      setMessage("Save your draft first, then preview.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const payload = buildStudyPayload(form.status === "published" ? "published" : "draft");
      const updated = await api.updateCaseStudy(studyId, payload);
      const merged = {
        ...updated,
        cover_image: payload.cover_image ?? updated.cover_image,
      };
      saveCaseStudyToCache(merged);
      setForm(merged);
      setMethodsInput(updated.methods.join(", "));
      window.open(`/admin/case-studies/${studyId}/preview`, "_blank", "noopener,noreferrer");
    } catch {
      const cached = buildCachedStudy(form.status === "published" ? "published" : "draft");
      if (cached) {
        saveCaseStudyToCache(cached);
        window.open(`/admin/case-studies/${studyId}/preview`, "_blank", "noopener,noreferrer");
      } else {
        setMessageType("error");
        setMessage("Could not save preview. Fix any errors and save your draft first.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    const validationErrors = await runValidation(true);
    if (Object.keys(validationErrors).length > 0) {
      showValidationErrors(validationErrors);
      return;
    }
    if (
      !confirm(
        "Publish this case study? It will appear on your portfolio and in the discover feed.",
      )
    ) {
      return;
    }
    const fakeEvent = { preventDefault: () => undefined } as FormEvent;
    await handleSubmit(fakeEvent, true);
  }

  async function handleDelete() {
    if (studyId == null) return;
    if (!confirm("Delete this case study permanently?")) return;
    try {
      await api.deleteCaseStudy(studyId);
    } catch {
      // Allow deleting drafts that only exist in local cache.
    }
    removeCaseStudyFromCache(studyId);
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
        <div className="flex flex-wrap gap-2">
          {!isNew ? (
            <>
              <button type="button" onClick={handlePreview} className="btn-secondary">
                <Eye className="h-4 w-4" />
                Preview
              </button>
              {form.status !== "published" ? (
                <button type="button" onClick={handlePublish} className="btn-secondary" disabled={saving}>
                  <Upload className="h-4 w-4" />
                  Publish
                </button>
              ) : null}
            </>
          ) : null}
          {!isNew ? (
            <button type="button" onClick={handleDelete} className="btn-secondary text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
          <button type="submit" form="case-study-form" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save draft"}
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            messageType === "error"
              ? "border border-red-100 bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {isNew ? (
        <div className="mb-4 rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-700">
          <p className="font-medium text-ink-900">New here? Use the homepage as your guide.</p>
          <p className="mt-1">
            Browse{" "}
            <Link to="/#discover" className="font-semibold text-brand-700 hover:underline">
              recently published case studies
            </Link>{" "}
            for examples of titles, summaries, cover images (1200×750), methods, and impact sections —
            then mirror that structure in your own portfolio piece.
          </p>
        </div>
      ) : null}

      <form id="case-study-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Project Overview</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <UrlOrUploadField
                  variant="cover"
                  label={`Cover Image${form.status === "published" || fieldErrors.cover_image ? " *" : ""}`}
                  value={form.cover_image || ""}
                  onChange={(url) => {
                    updateField("cover_image", url);
                    clearFieldError("cover_image");
                  }}
                  onCommit={(url) => {
                    if (!isNew && studyId != null) void persistDraftQuietly(url);
                  }}
                  onValidationError={(message) => {
                    setFieldErrors((prev) => ({ ...prev, cover_image: message }));
                  }}
                  inputRef={(el) => {
                    fieldRefs.current.cover_image = el;
                  }}
                  hasError={Boolean(fieldErrors.cover_image)}
                  required={form.status === "published"}
                  accept="image/jpeg,image/png,image/webp"
                  placeholder="https://images.unsplash.com/... or upload from your device"
                  helpText={COVER_HELP_TEXT}
                />
                {fieldErrors.cover_image ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.cover_image}</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label className={fieldLabelClass(Boolean(fieldErrors.title))}>Title *</label>
                <input
                  ref={(el) => {
                    fieldRefs.current.title = el;
                  }}
                  className={fieldInputClass(Boolean(fieldErrors.title))}
                  value={form.title || ""}
                  onChange={(e) => {
                    updateField("title", e.target.value);
                    clearFieldError("title");
                  }}
                />
                {fieldErrors.title ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
                ) : null}
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
                <label className={fieldLabelClass(Boolean(fieldErrors.summary))}>
                  Summary{fieldErrors.summary ? " *" : ""}
                </label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current.summary = el;
                  }}
                  className={`${fieldInputClass(Boolean(fieldErrors.summary))} min-h-[80px]`}
                  value={form.summary || ""}
                  onChange={(e) => {
                    updateField("summary", e.target.value);
                    clearFieldError("summary");
                  }}
                />
                {fieldErrors.summary ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.summary}</p>
                ) : null}
              </div>
            </div>
          </section>

          {(["challenge", "methodology", "impact", "reflections"] as const).map((field) => (
            <section key={field} className="card p-6">
              <h2
                className={`mb-4 font-semibold capitalize ${
                  fieldErrors[field as FieldKey] ? "text-red-700" : "text-ink-900"
                }`}
              >
                {field}
                {field !== "reflections" && fieldErrors[field as FieldKey] ? " *" : ""}
              </h2>
              <textarea
                ref={(el) => {
                  if (field !== "reflections") {
                    fieldRefs.current[field as FieldKey] = el;
                  }
                }}
                className={`${fieldInputClass(Boolean(fieldErrors[field as FieldKey]))} min-h-[120px]`}
                value={form[field] || ""}
                onChange={(e) => {
                  updateField(field, e.target.value);
                  if (field !== "reflections") clearFieldError(field as FieldKey);
                }}
              />
              {fieldErrors[field as FieldKey] ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors[field as FieldKey]}</p>
              ) : null}
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
                      <UrlOrUploadField
                        label="Image"
                        value={String(block.data.url || "")}
                        onChange={(url) => updateBlock(index, { url })}
                        accept="image/*"
                      />
                      <input
                        className="input-field"
                        placeholder="Caption"
                        value={String(block.data.caption || "")}
                        onChange={(e) => updateBlock(index, { caption: e.target.value })}
                      />
                    </div>
                  ) : null}

                  {block.type === "gallery" ? (
                    <div className="space-y-3">
                      {((block.data.images as Array<{ url: string; caption?: string }>) || []).map(
                        (image, imageIndex) => (
                          <div key={imageIndex} className="rounded-lg border border-ink-100 bg-white p-3">
                            <UrlOrUploadField
                              label={`Gallery image ${imageIndex + 1}`}
                              value={image.url}
                              onChange={(url) => updateGalleryImage(index, imageIndex, { url })}
                              accept="image/*"
                            />
                            <input
                              className="input-field mt-2"
                              placeholder="Caption"
                              value={image.caption || ""}
                              onChange={(e) =>
                                updateGalleryImage(index, imageIndex, { caption: e.target.value })
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index, imageIndex)}
                              className="mt-2 text-xs text-red-500 hover:text-red-700"
                            >
                              Remove image
                            </button>
                          </div>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => addGalleryImage(index)}
                        className="text-sm text-brand-600"
                      >
                        + Add gallery image
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {!isNew ? (
            <section className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-ink-900">Research Reports</h2>
                  <p className="mt-1 text-xs text-ink-500">Upload PDFs or documents for investors and hiring managers</p>
                </div>
                <div>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="btn-secondary py-2 text-xs"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingAttachment ? "Uploading..." : "Upload file"}
                  </button>
                </div>
              </div>
              {(form.attachments || []).length === 0 ? (
                <p className="text-sm text-ink-500">No attachments yet. Upload a research report from your device.</p>
              ) : (
                <div className="space-y-2">
                  {(form.attachments || []).map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-600" />
                        <div>
                          <p className="text-sm font-medium text-ink-900">{attachment.title}</p>
                          <p className="text-xs text-ink-400">{attachment.file_type}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Publish</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-ink-50 px-4 py-3 text-sm text-ink-600">
                <p className="font-medium text-ink-800">
                  Status:{" "}
                  <span className={form.status === "published" ? "text-emerald-600" : "text-amber-600"}>
                    {form.status === "published" ? "Published" : "Draft"}
                  </span>
                </p>
                <p className="mt-1 text-xs">
                  Save as draft anytime. Use Preview to check layout, then Publish when ready.
                </p>
              </div>
              {!isNew ? (
                <button type="button" onClick={handlePreview} className="btn-secondary w-full">
                  <Eye className="h-4 w-4" />
                  Preview before publishing
                </button>
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured || false}
                  onChange={(e) => updateField("featured", e.target.checked)}
                  className="rounded border-ink-300"
                />
                Featured on your portfolio
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
              {user?.portfolio_url ? (
                <p className="text-xs text-ink-500">
                  Live portfolio:{" "}
                  <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-brand-600">
                    {user.portfolio_url}
                  </a>
                </p>
              ) : null}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-900">Research Methods</h2>
            <input
              ref={(el) => {
                fieldRefs.current.methods = el;
              }}
              className={fieldInputClass(Boolean(fieldErrors.methods))}
              value={methodsInput}
              onChange={(e) => {
                setMethodsInput(e.target.value);
                clearFieldError("methods");
              }}
              placeholder="Comma-separated methods"
            />
            {fieldErrors.methods ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.methods}</p>
            ) : null}
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
