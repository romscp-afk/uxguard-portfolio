import type { PortfolioSettings } from "../types";

/** Matches `portfolioSettings` seed in api/_lib/store.js — keeps first paint in sync with API. */
export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  site_title: "UXGuard Studio",
  tagline: "Build your professional identity",
  hero_title: "Measure your impact. Showcase your journey.",
  hero_subtitle:
    "For UX professionals building evidence-driven portfolios — and for employers hiring with verified company profiles and job posts.",
  about:
    "UXGuard Studio helps UX researchers, designers, and product teams build lasting professional legacies, while giving hiring teams a separate employer portal to publish jobs after admin approval.",
  contact_email: "uxguardstudio@gmail.com",
  social_links: { linkedin: "https://www.linkedin.com/company/uxguard-studio/", twitter: "https://twitter.com" },
};
