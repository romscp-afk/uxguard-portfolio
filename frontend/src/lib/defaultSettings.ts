import type { PortfolioSettings } from "../types";

/** Matches `portfolioSettings` seed in api/_lib/store.js — keeps first paint in sync with API. */
export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  site_title: "UXguard",
  tagline: "Evidence-driven UX research case studies",
  hero_title: "Discover UX research from practitioners worldwide",
  hero_subtitle:
    "Browse published case studies, explore researcher portfolios, and share your own work with a personal portfolio link.",
  about:
    "UXguard is a portfolio platform for UX researchers. Publish case studies, attach research reports, and share a personal link for your CV — like Behance for research.",
  contact_email: "hello@uxguard.io",
  social_links: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
};
