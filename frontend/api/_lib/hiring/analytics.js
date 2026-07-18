import { updateStore } from "../store.js";

const ALLOWED_EVENTS = new Set([
  "career_timeline_opened",
  "timeline_entry_added",
  "timeline_import_completed",
  "timeline_gap_reviewed",
  "timeline_entry_added_to_resume",
  "public_profile_enabled",
  "employer_onboarding_started",
  "employer_profile_completed",
  "job_draft_created",
  "job_published",
  "job_closed",
  "application_received",
  "application_stage_changed",
  "job_search_completed",
  "job_viewed",
  "job_saved",
  "application_started",
  "application_submitted",
  "application_withdrawn",
  "job_reported",
]);

function nextId(list) {
  return (list || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

/** Strip PII / sensitive content from analytics meta. */
function sanitizeMeta(meta = {}) {
  const out = {};
  for (const [key, value] of Object.entries(meta || {})) {
    if (
      /name|email|phone|note|answer|resume|letter|salary|address/i.test(key)
    ) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((v) => typeof v === "string" || typeof v === "number")) {
      out[key] = value.slice(0, 20);
    }
  }
  return out;
}

export async function trackHiringEvent(event, userId = null, meta = {}) {
  if (!ALLOWED_EVENTS.has(event)) return null;
  let saved = null;
  await updateStore(
    (store) => {
      if (!store.hiring_analytics_events) store.hiring_analytics_events = [];
      saved = {
        id: nextId(store.hiring_analytics_events),
        event,
        user_id: userId == null ? null : Number(userId),
        meta: sanitizeMeta(meta),
        created_at: new Date().toISOString(),
      };
      store.hiring_analytics_events.push(saved);
      // Keep store bounded
      if (store.hiring_analytics_events.length > 5000) {
        store.hiring_analytics_events = store.hiring_analytics_events.slice(-4000);
      }
      return store;
    },
    { forceRefresh: true },
  );
  return saved;
}
