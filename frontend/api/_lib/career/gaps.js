import {
  DEFAULT_GAP_MONTHS,
  computeEntryDurationMonths,
  monthsBetween,
  parseLooseDate,
} from "./schema.js";
import { findInconsistentNames, findOverlappingEmployment } from "./duplicates.js";

function employmentWindows(entries) {
  return (entries || [])
    .filter((item) => !item.deleted_at && !item.hidden && item.type === "employment")
    .map((item) => {
      const start = parseLooseDate(item.start_date);
      const end = item.is_current
        ? new Date()
        : parseLooseDate(item.end_date) || parseLooseDate(item.start_date);
      if (!start || !end) return null;
      return { id: item.id, start, end, entry: item };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

export function detectCareerGaps(entries = [], { minGapMonths = DEFAULT_GAP_MONTHS } = {}) {
  const windows = employmentWindows(entries);
  const gaps = [];
  for (let i = 0; i < windows.length - 1; i += 1) {
    const current = windows[i];
    const next = windows[i + 1];
    const gapMonths = monthsBetween(current.end, next.start);
    if (gapMonths >= minGapMonths) {
      gaps.push({
        after_entry_id: current.id,
        before_entry_id: next.id,
        start_date: current.end.toISOString().slice(0, 10),
        end_date: next.start.toISOString().slice(0, 10),
        months: gapMonths,
        message:
          "We found a period that is not represented in your timeline. You can add employment, education, a project, a career break, or leave it unchanged.",
      });
    }
  }
  return gaps;
}

export function buildCareerInsights(entries = [], { minGapMonths = DEFAULT_GAP_MONTHS } = {}) {
  const active = (entries || []).filter((item) => !item.deleted_at && !item.hidden);
  const employment = active.filter((item) => item.type === "employment");
  const promotions = active.filter((item) => item.type === "promotion");

  const employers = new Set(
    employment.map((item) => item.organisation).filter(Boolean).map((v) => v.toLowerCase()),
  );

  const durations = employment.map((item) => ({
    id: item.id,
    months: computeEntryDurationMonths(item),
    title: item.title,
    organisation: item.organisation,
  }));
  const longest = [...durations].sort((a, b) => b.months - a.months)[0] || null;
  const avg =
    durations.length > 0
      ? Math.round(durations.reduce((sum, item) => sum + item.months, 0) / durations.length)
      : 0;

  const starts = employment
    .map((item) => parseLooseDate(item.start_date))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const careerStart = starts[0] || null;

  const currentRole =
    employment.find((item) => item.is_current) ||
    [...employment].sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] ||
    null;

  const totalMonths = durations.reduce((sum, item) => sum + item.months, 0);

  const missingDates = active
    .filter((item) => !item.start_date || (!item.is_current && !item.end_date && item.type !== "award" && item.type !== "certification" && item.type !== "milestone"))
    .map((item) => item.id);

  const skillStages = {};
  for (const item of employment) {
    const stage = item.start_date ? String(item.start_date).slice(0, 4) || "unknown" : "unknown";
    if (!skillStages[stage]) skillStages[stage] = {};
    for (const skill of item.skills || []) {
      skillStages[stage][skill] = (skillStages[stage][skill] || 0) + 1;
    }
  }

  return {
    total_experience_months: totalMonths,
    total_years: Math.round((totalMonths / 12) * 10) / 10,
    employer_count: employers.size,
    role_count: employment.length,
    average_role_months: avg,
    longest_role: longest,
    career_start_year: careerStart ? careerStart.getUTCFullYear() : null,
    current_role: currentRole
      ? {
          id: currentRole.id,
          title: currentRole.title,
          organisation: currentRole.organisation,
        }
      : null,
    promotion_count: promotions.length,
    skills_by_stage: skillStages,
    gaps: detectCareerGaps(active, { minGapMonths }),
    overlaps: findOverlappingEmployment(active),
    inconsistent_company_names: findInconsistentNames(active),
    missing_date_entry_ids: missingDates,
    entry_count: active.length,
  };
}
