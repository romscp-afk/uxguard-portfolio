import type { PortfolioSettings } from "../types";

/** Matches `portfolioSettings` seed in api/_lib/store.js — keeps first paint in sync with API. */
export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  site_title: "UXGuard Studio",
  tagline: "Build your professional identity",
  hero_title: "Measure your impact. Showcase your journey.",
  hero_subtitle:
    "The professional platform for UX researchers, designers, and product teams to document research, prove outcomes, and showcase real impact.",
  about:
    "UXGuard Studio helps UX researchers, designers, and product teams build more than a gallery—organize work, tell complete case studies, and present impact with confidence.",
  contact_email: "uxguardstudio@gmail.com",
  social_links: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
};
