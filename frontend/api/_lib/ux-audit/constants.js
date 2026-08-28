/** UX audit framework v1 — weighted categories (must sum to 1). */
export const CATEGORY_WEIGHTS = {
  usability_navigation: 0.25,
  conversion_journey: 0.25,
  accessibility: 0.15,
  mobile_experience: 0.15,
  performance: 0.1,
  content_trust: 0.1,
};

export const CATEGORY_LABELS = {
  usability_navigation: "Usability & navigation",
  conversion_journey: "Conversion journey",
  accessibility: "Accessibility",
  mobile_experience: "Mobile experience",
  performance: "Performance",
  content_trust: "Content & trust",
};

export const SCAN_VERSION = "2.0.0";

export const SEVERITY_PENALTY = {
  critical: 18,
  high: 12,
  medium: 7,
  low: 3,
};

export const SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const CONFIDENCE_WEIGHT = {
  confirmed: 3,
  likely: 2,
  requires_expert_review: 1,
};

export const EFFORT_DIVISOR = {
  low: 1,
  medium: 2,
  high: 3,
};

export const BUSINESS_IMPACT_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};
