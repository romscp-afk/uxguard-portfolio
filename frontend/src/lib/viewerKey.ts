const VIEWER_KEY_STORAGE = "uxguard_viewer_key";

/** Stable anonymous viewer id for view dedupe (client + server). */
export function getOrCreateViewerKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VIEWER_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(VIEWER_KEY_STORAGE, key);
    return key;
  } catch {
    return `ephemeral-${Date.now()}`;
  }
}

export function sessionViewGuardKey(caseStudyId: number) {
  return `uxguard_viewed_${caseStudyId}`;
}
