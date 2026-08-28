/** UX audit framework v3 — weighted categories (must sum to 1). */
export const CATEGORY_WEIGHTS = {
  conversion_experience: 0.25,
  usability_navigation: 0.2,
  accessibility: 0.15,
  mobile_experience: 0.15,
  content_trust: 0.15,
  performance: 0.1,
};

/** Legacy alias map for stored audits and display */
export const LEGACY_CATEGORY_MAP = {
  conversion_journey: "conversion_experience",
  usability_navigation: "usability_navigation",
  accessibility: "accessibility",
  mobile_experience: "mobile_experience",
  content_trust: "content_trust",
  performance: "performance",
};

export const CATEGORY_LABELS = {
  conversion_experience: "Conversion experience",
  usability_navigation: "Usability & navigation",
  accessibility: "Accessibility",
  mobile_experience: "Mobile experience",
  content_trust: "Content & trust",
  performance: "Performance",
};

export const SCAN_VERSION = "3.0.0";
export const SCORING_MODEL_VERSION = "3.0.0";

export const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITY_CONFIDENCE = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
  confirmed: 1.0,
  likely: 0.7,
  requires_expert_review: 0.4,
};

export const BUSINESS_IMPACT_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};

export const EFFORT_DIVISOR = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Legacy v2 scoring helpers — retained for backward-compatible tests and scan-html */
export const CONFIDENCE_WEIGHT = {
  confirmed: 1.0,
  likely: 0.85,
  requires_expert_review: 0.5,
};

export const SEVERITY_PENALTY = {
  critical: 18,
  high: 12,
  medium: 7,
  low: 3,
};

export const SCAN_LIMITATIONS = [
  "This is an automated accessibility assessment — not WCAG certification or a guarantee of compliance.",
  "JavaScript-rendered content may not be fully evaluated unless browser rendering is enabled.",
  "Computed colour contrast and keyboard behaviour require rendered-page analysis (Phase 2).",
  "Behavioural metrics such as conversion rate require analytics integration — they are not estimated from HTML.",
  "Logged-in or authenticated journeys need a separately arranged expert audit.",
  "Findings marked for expert review should be validated by a UX specialist.",
];
