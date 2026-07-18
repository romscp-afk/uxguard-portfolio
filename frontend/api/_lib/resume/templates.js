export const RESUME_TEMPLATES = [
  {
    id: "modern_professional",
    name: "Modern Professional",
    description: "Clean two-tone layout with a clear visual hierarchy for design and product roles.",
    thumbnail: "modern",
    supports_two_column: true,
    ats_friendly: false,
    defaults: {
      primary_color: "#1e3a5f",
      accent_color: "#2f6fed",
      font_family: "Helvetica",
      font_size: 10,
      line_spacing: 1.25,
      section_spacing: 12,
      margins: 48,
      layout: "single",
      show_photo: false,
      date_format: "mmm_yyyy",
      page_size: "a4",
    },
  },
  {
    id: "classic_ats",
    name: "Classic ATS",
    description: "Single-column, standard headings, selectable text — built for applicant tracking systems.",
    thumbnail: "ats",
    supports_two_column: false,
    ats_friendly: true,
    defaults: {
      primary_color: "#111827",
      accent_color: "#111827",
      font_family: "Times-Roman",
      font_size: 11,
      line_spacing: 1.15,
      section_spacing: 10,
      margins: 54,
      layout: "single",
      show_photo: false,
      date_format: "mmm_yyyy",
      page_size: "letter",
    },
  },
  {
    id: "executive_minimal",
    name: "Executive Minimal",
    description: "Sparse, confident layout for senior and leadership profiles.",
    thumbnail: "executive",
    supports_two_column: false,
    ats_friendly: true,
    defaults: {
      primary_color: "#0f172a",
      accent_color: "#64748b",
      font_family: "Helvetica",
      font_size: 10.5,
      line_spacing: 1.3,
      section_spacing: 14,
      margins: 56,
      layout: "single",
      show_photo: false,
      date_format: "yyyy",
      page_size: "a4",
    },
  },
];

export function getTemplateById(id) {
  return RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[1];
}

export function normalizeResumeSettings(settings = {}, templateId = "classic_ats") {
  const template = getTemplateById(templateId);
  const base = { ...template.defaults, ...(settings || {}) };
  return {
    primary_color: String(base.primary_color || template.defaults.primary_color),
    accent_color: String(base.accent_color || template.defaults.accent_color),
    font_family: ["Helvetica", "Times-Roman", "Courier"].includes(base.font_family)
      ? base.font_family
      : template.defaults.font_family,
    font_size: Math.min(14, Math.max(9, Number(base.font_size) || template.defaults.font_size)),
    line_spacing: Math.min(1.6, Math.max(1, Number(base.line_spacing) || template.defaults.line_spacing)),
    section_spacing: Math.min(24, Math.max(6, Number(base.section_spacing) || template.defaults.section_spacing)),
    margins: Math.min(72, Math.max(36, Number(base.margins) || template.defaults.margins)),
    layout: base.layout === "two" && template.supports_two_column ? "two" : "single",
    show_photo: Boolean(base.show_photo),
    date_format: ["mmm_yyyy", "yyyy", "mm_yyyy"].includes(base.date_format)
      ? base.date_format
      : "mmm_yyyy",
    page_size: base.page_size === "letter" ? "letter" : "a4",
  };
}

export function listTemplates() {
  return RESUME_TEMPLATES.map(({ id, name, description, thumbnail, supports_two_column, ats_friendly, defaults }) => ({
    id,
    name,
    description,
    thumbnail,
    supports_two_column,
    ats_friendly,
    defaults,
  }));
}
