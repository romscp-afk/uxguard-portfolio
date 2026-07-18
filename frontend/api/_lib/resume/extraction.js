/**
 * Build field-level extraction metadata for the review UI.
 * Confidence is derived from whether extracted values appear in source text —
 * we never invent missing data, and unclear values are marked needs_review.
 */

const PARSER_VERSION = "2.0.0";

function normalizeHaystack(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function valueInSource(value, haystack) {
  const needle = normalizeHaystack(value);
  if (!needle || needle.length < 2) return false;
  // Short tokens (e.g. dates) need exact-ish presence
  if (needle.length < 4) {
    return haystack.includes(needle);
  }
  // Allow minor whitespace differences
  return haystack.includes(needle) || haystack.includes(needle.replace(/[.,]/g, ""));
}

function scoreScalar(value, haystack, { required = false } = {}) {
  const trimmed = value == null ? "" : String(value).trim();
  if (!trimmed) {
    return {
      value: "",
      confidence: 0,
      status: required ? "missing" : "not_imported",
      reviewed: false,
      changed: false,
      source_text: "",
    };
  }
  const found = valueInSource(trimmed, haystack);
  return {
    value: trimmed,
    confidence: found ? 0.92 : 0.45,
    status: found ? "confirmed" : "needs_review",
    reviewed: false,
    changed: false,
    source_text: found ? trimmed : "",
  };
}

function scoreList(values, haystack) {
  const list = Array.isArray(values) ? values.map((v) => String(v || "").trim()).filter(Boolean) : [];
  if (!list.length) {
    return {
      value: [],
      confidence: 0,
      status: "not_imported",
      reviewed: false,
      changed: false,
      source_text: "",
    };
  }
  const hits = list.filter((item) => valueInSource(item, haystack)).length;
  const ratio = hits / list.length;
  return {
    value: list,
    confidence: Math.round(ratio * 100) / 100,
    status: ratio >= 0.7 ? "confirmed" : "needs_review",
    reviewed: false,
    changed: false,
    source_text: list.filter((item) => valueInSource(item, haystack)).slice(0, 3).join(" | "),
  };
}

/**
 * Lightweight heuristic structuring when AI is unavailable.
 * Only extracts values that are clearly present — never invents.
 */
export function heuristicStructureFromText(rawText) {
  const text = String(rawText || "");
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/,
  );
  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i);
  const urlMatch = text.match(/https?:\/\/[^\s)]+/i);

  const sectionHeaders =
    /^(summary|profile|objective|experience|work experience|employment|education|skills|projects|certifications|awards|languages)\b/i;

  let current = "header";
  const buckets = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };

  for (const line of lines) {
    const header = line.match(sectionHeaders);
    if (header) {
      const key = header[1].toLowerCase();
      if (key.includes("summary") || key.includes("profile") || key.includes("objective")) {
        current = "summary";
      } else if (key.includes("experience") || key.includes("employment")) {
        current = "experience";
      } else if (key.includes("education")) {
        current = "education";
      } else if (key.includes("skill")) {
        current = "skills";
      } else if (key.includes("project")) {
        current = "projects";
      } else if (key.includes("certif")) {
        current = "certifications";
      } else {
        current = "header";
      }
      continue;
    }
    if (!buckets[current]) buckets[current] = [];
    buckets[current].push(line);
  }

  const nameCandidate = (buckets.header[0] || lines[0] || "").replace(emailMatch?.[0] || "", "").trim();
  const titleCandidate = buckets.header[1] || "";

  const skills = [];
  for (const line of buckets.skills) {
    line.split(/[,•·|]/).forEach((part) => {
      const name = part.trim();
      if (name && name.length < 60) skills.push(name);
    });
  }

  const experience = [];
  let block = null;
  for (const line of buckets.experience) {
    const dateish = /(\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)/i.test(
      line,
    );
    if (dateish && /[-–—]|to|present|current/i.test(line)) {
      if (block) experience.push(block);
      block = {
        company: "",
        role: line,
        location: "",
        start: "",
        end: "",
        current: /present|current/i.test(line),
        bullets: [],
      };
      continue;
    }
    if (!block) {
      block = {
        company: line,
        role: "",
        location: "",
        start: "",
        end: "",
        current: false,
        bullets: [],
      };
    } else if (!block.company && !dateish) {
      block.company = line;
    } else if (line.startsWith("•") || line.startsWith("-") || line.startsWith("*")) {
      block.bullets.push(line.replace(/^[-•*]\s*/, ""));
    } else if (block.bullets.length || block.role) {
      block.bullets.push(line);
    } else {
      block.role = block.role || line;
    }
  }
  if (block) experience.push(block);

  return {
    basics: {
      name: nameCandidate.slice(0, 120),
      title: titleCandidate.slice(0, 160),
      email: emailMatch?.[0] || "",
      phone: phoneMatch?.[0] || "",
      location: "",
      summary: buckets.summary.join("\n").slice(0, 2000),
      linkedin_url: linkedinMatch?.[0] || "",
      website_url: urlMatch && !linkedinMatch && !githubMatch ? urlMatch[0] : "",
      github_url: githubMatch?.[0] || "",
      links: [],
    },
    experience: experience.slice(0, 12),
    education: buckets.education.slice(0, 8).map((line) => ({
      school: line,
      degree: "",
      field: "",
      start: "",
      end: "",
      details: "",
    })),
    skills: skills.slice(0, 40),
    certifications: buckets.certifications.slice(0, 10).map((line) => ({
      name: line,
      issuer: "",
      year: "",
    })),
    projects: buckets.projects.slice(0, 8).map((line) => ({
      name: line,
      url: "",
      summary: "",
    })),
  };
}

export function detectScannedPdf(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return true;
  // Very little selectable text relative to typical resume length
  const words = text.split(/\s+/).filter(Boolean);
  return words.length < 40;
}

export function buildExtractionPayload({
  resume,
  rawText,
  warnings = [],
  parser = "heuristic",
  aiUsed = false,
}) {
  const haystack = normalizeHaystack(rawText);
  const basics = resume.basics || {};

  const fields = {
    "basics.name": scoreScalar(basics.name, haystack, { required: true }),
    "basics.title": scoreScalar(basics.title, haystack),
    "basics.email": scoreScalar(basics.email, haystack, { required: true }),
    "basics.phone": scoreScalar(basics.phone, haystack),
    "basics.location": scoreScalar(basics.location || basics.city, haystack),
    "basics.summary": scoreScalar(basics.summary, haystack),
    "basics.linkedin_url": scoreScalar(basics.linkedin_url, haystack),
    experience_count: {
      value: (resume.experience || []).length,
      confidence: (resume.experience || []).length ? 0.7 : 0,
      status: (resume.experience || []).length ? "needs_review" : "missing",
      reviewed: false,
      changed: false,
      source_text: "",
    },
    education_count: {
      value: (resume.education || []).length,
      confidence: (resume.education || []).length ? 0.7 : 0,
      status: (resume.education || []).length ? "needs_review" : "not_imported",
      reviewed: false,
      changed: false,
      source_text: "",
    },
    skills: scoreList(
      (resume.skills || []).map((s) => (typeof s === "string" ? s : s.name)),
      haystack,
    ),
  };

  const entries = Object.values(fields);
  const needsReview = entries.filter((f) => f.status === "needs_review" || f.status === "missing");
  const allWarnings = [...warnings];
  if (detectScannedPdf(rawText)) {
    allWarnings.push({
      code: "possible_scan",
      message:
        "Little selectable text was found. This may be a scanned PDF. OCR is not configured — please fill fields manually.",
    });
  }
  if (!aiUsed && parser === "heuristic") {
    allWarnings.push({
      code: "heuristic_parse",
      message:
        "AI parsing is not configured. Fields were inferred from document text and need careful review.",
    });
  }

  return {
    parser_version: PARSER_VERSION,
    parser,
    ai_used: Boolean(aiUsed),
    status: "pending_review",
    raw_text: String(rawText || "").slice(0, 80_000),
    warnings: allWarnings,
    fields,
    needs_review_count: needsReview.length,
    created_at: new Date().toISOString(),
    reviewed_at: null,
  };
}

export { PARSER_VERSION };
