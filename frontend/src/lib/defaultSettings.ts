import type { PortfolioSettings } from "../types";

/** Matches `portfolioSettings` seed in api/_lib/store.js — keeps first paint in sync with API. */
export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  site_title: "UXGuard Studio",
  tagline: "Build your professional identity",
  hero_title: "Measure your impact. Showcase your journey.",
  hero_subtitle:
    "UXGuard Studio is your professional operating system—not another portfolio gallery. Document how you think, solve problems, and deliver measurable impact across research, design, and product work.",
  about:
    "UXGuard Studio helps UX researchers, designers, product leaders, and digital professionals build more than a portfolio. Organize your work, tell complete case study stories, and present your professional legacy with confidence.",
  contact_email: "hello@uxguard.io",
  social_links: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
};
