import { emptyTimelineEntry, normalizeTimelineEntry } from "./schema.js";
import { findDuplicateCandidates } from "./duplicates.js";

function mapExperience(item, resumeId) {
  return emptyTimelineEntry(0, {
    type: "employment",
    title: item.role || "",
    organisation: item.company || "",
    location: item.location || "",
    start_date: item.start || "",
    end_date: item.end || "",
    is_current: Boolean(item.current),
    description: item.description || "",
    achievements: item.bullets || [],
    skills: item.tools || [],
    employment_type: item.employment_type || "",
    working_arrangement: item.work_mode || "",
    source_type: "resume_import",
    source_resume_id: resumeId,
    source_section: "experience",
    source_item_id: item.id || null,
  });
}

function mapEducation(item, resumeId) {
  return emptyTimelineEntry(0, {
    type: "education",
    title: [item.degree, item.field].filter(Boolean).join(" — ") || item.school || "Education",
    organisation: item.school || "",
    location: item.location || "",
    start_date: item.start || "",
    end_date: item.end || "",
    is_current: Boolean(item.current),
    description: item.details || "",
    field_of_study: item.field || "",
    source_type: "resume_import",
    source_resume_id: resumeId,
    source_section: "education",
    source_item_id: item.id || null,
  });
}

function mapProject(item, resumeId) {
  return emptyTimelineEntry(0, {
    type: "project",
    title: item.name || "Project",
    organisation: item.organization || "",
    start_date: item.start || "",
    end_date: item.end || "",
    description: item.summary || "",
    achievements: item.outcomes || [],
    skills: item.tools || [],
    supporting_url: item.url || "",
    source_type: "resume_import",
    source_resume_id: resumeId,
    source_section: "projects",
    source_item_id: item.id || null,
  });
}

function mapCertification(item, resumeId) {
  return emptyTimelineEntry(0, {
    type: "certification",
    title: item.name || "Certification",
    organisation: item.issuer || "",
    start_date: item.issue_date || item.year || "",
    end_date: item.expiration_date || "",
    issuer: item.issuer || "",
    expiration_date: item.expiration_date || "",
    credential_details: item.credential_id || "",
    supporting_url: item.credential_url || "",
    source_type: "resume_import",
    source_resume_id: resumeId,
    source_section: "certifications",
    source_item_id: item.id || null,
  });
}

function mapSimple(item, type, resumeId, section) {
  return emptyTimelineEntry(0, {
    type,
    title: item.title || item.name || type,
    organisation: item.issuer || item.organization || "",
    start_date: item.date || item.year || "",
    description: item.description || item.details || "",
    supporting_url: item.url || "",
    issuer: item.issuer || "",
    source_type: "resume_import",
    source_resume_id: resumeId,
    source_section: section,
    source_item_id: item.id || null,
  });
}

export function resumeToTimelineCandidates(resume) {
  if (!resume) return [];
  const resumeId = Number(resume.id) || null;
  const out = [];
  for (const item of resume.experience || []) out.push(mapExperience(item, resumeId));
  for (const item of resume.education || []) out.push(mapEducation(item, resumeId));
  for (const item of resume.projects || []) out.push(mapProject(item, resumeId));
  for (const item of resume.certifications || []) out.push(mapCertification(item, resumeId));
  for (const item of resume.awards || []) out.push(mapSimple(item, "award", resumeId, "awards"));
  for (const item of resume.volunteering || []) {
    out.push(mapSimple(item, "volunteering", resumeId, "volunteering"));
  }
  return out.map((item) => normalizeTimelineEntry(item));
}

/**
 * Classify import candidates against existing timeline.
 * Returns { ready: entries without conflicts, duplicates: [{ candidate, matches }] }
 */
export function classifyImportCandidates(candidates, existingEntries = []) {
  const ready = [];
  const duplicates = [];
  for (const candidate of candidates) {
    const matches = findDuplicateCandidates(candidate, existingEntries);
    if (matches.length) {
      duplicates.push({ candidate, matches });
    } else {
      ready.push(candidate);
    }
  }
  return { ready, duplicates };
}
