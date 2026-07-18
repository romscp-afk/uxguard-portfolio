import { entryMatchKey, normalizeKeyPart, parseLooseDate } from "./schema.js";

export function findDuplicateCandidates(entry, existingEntries = []) {
  const key = entryMatchKey(entry);
  const org = normalizeKeyPart(entry.organisation);
  const title = normalizeKeyPart(entry.title);
  const start = normalizeKeyPart(entry.start_date).slice(0, 7);

  return (existingEntries || [])
    .filter((item) => !item.deleted_at)
    .filter((item) => {
      if (entryMatchKey(item) === key) return true;
      if (item.type !== entry.type) return false;
      const sameOrg = org && normalizeKeyPart(item.organisation) === org;
      const sameTitle = title && normalizeKeyPart(item.title) === title;
      const sameStart =
        start && normalizeKeyPart(item.start_date).slice(0, 7) === start;
      // Strong signal: org + title + overlapping type
      if (sameOrg && sameTitle) return true;
      // Medium: org + start month
      if (sameOrg && sameStart && sameTitle) return true;
      return false;
    })
    .map((item) => ({
      existing_id: item.id,
      match_key: entryMatchKey(item),
      confidence: entryMatchKey(item) === key ? "high" : "medium",
      entry: item,
    }));
}

export function datesOverlap(a, b) {
  const aStart = parseLooseDate(a.start_date);
  const bStart = parseLooseDate(b.start_date);
  if (!aStart || !bStart) return false;
  const aEnd = a.is_current ? new Date() : parseLooseDate(a.end_date) || aStart;
  const bEnd = b.is_current ? new Date() : parseLooseDate(b.end_date) || bStart;
  return aStart <= bEnd && bStart <= aEnd;
}

export function findOverlappingEmployment(entries = []) {
  const jobs = (entries || []).filter(
    (item) => !item.deleted_at && !item.hidden && item.type === "employment",
  );
  const overlaps = [];
  for (let i = 0; i < jobs.length; i += 1) {
    for (let j = i + 1; j < jobs.length; j += 1) {
      if (datesOverlap(jobs[i], jobs[j])) {
        overlaps.push({ a_id: jobs[i].id, b_id: jobs[j].id });
      }
    }
  }
  return overlaps;
}

export function findInconsistentNames(entries = []) {
  const byOrg = new Map();
  for (const entry of entries || []) {
    if (entry.deleted_at || entry.hidden) continue;
    const key = normalizeKeyPart(entry.organisation);
    if (!key) continue;
    if (!byOrg.has(key)) byOrg.set(key, new Set());
    byOrg.get(key).add(entry.organisation);
  }
  const inconsistent = [];
  for (const [, names] of byOrg) {
    if (names.size > 1) {
      inconsistent.push({ variants: [...names] });
    }
  }
  return inconsistent;
}
