import type { User } from "../types";

export type PlatformRole = "admin" | "professional" | "viewer";
export type OnboardingIntent = "build_portfolio" | "track_career" | "publish_case_studies";

export function normalizeRole(role?: string): PlatformRole {
  if (role === "admin" || role === "professional" || role === "viewer") {
    return role;
  }
  return "professional";
}

export function canEditPlatform(user?: User | null): boolean {
  const role = normalizeRole(user?.role);
  return role === "admin" || role === "professional";
}

export function isAdmin(user?: User | null): boolean {
  return normalizeRole(user?.role) === "admin";
}

export const INTENT_OPTIONS = [
  {
    id: "build_portfolio" as const,
    title: "Build my portfolio",
    description: "Organize projects and showcase professional work.",
  },
  {
    id: "track_career" as const,
    title: "Track my career",
    description: "Document achievements, timeline, and growth over time.",
  },
  {
    id: "publish_case_studies" as const,
    title: "Publish case studies",
    description: "Write evidence-driven stories and share with the community.",
  },
];

export const ROLE_OPTIONS = [
  {
    id: "professional" as const,
    title: "Professional",
    description: "Full access to build and manage your portfolio.",
  },
  {
    id: "viewer" as const,
    title: "Viewer",
    description: "Read-only access to explore the platform and community.",
  },
];

type NavLink = { to: string; label: string; section: string; comingSoon?: boolean };

/** Fixed Platform nav order for launch */
const PLATFORM_LINKS: NavLink[] = [
  { to: "/admin/portfolio-builder", label: "Portfolio Builder", section: "portfolio" },
  { to: "/admin/profile", label: "Professional Profile", section: "profile" },
  { to: "/admin/projects", label: "Projects", section: "projects" },
  { to: "/admin/case-studies", label: "Case Studies", section: "case-studies" },
  { to: "/admin/analytics", label: "Analytics", section: "analytics" },
  { to: "/admin/ai", label: "UXGuard AI", section: "ai" },
  { to: "/admin/templates", label: "Templates", section: "templates" },
  { to: "/admin/media", label: "Media Library", section: "media" },
  { to: "/admin/billing", label: "Billing", section: "billing" },
  { to: "/admin/notifications", label: "Notifications", section: "notifications" },
];

const PHASE2_LINKS: NavLink[] = [
  { to: "#", label: "Resume Builder", section: "resume", comingSoon: true },
  { to: "#", label: "Career Timeline", section: "timeline", comingSoon: true },
  { to: "#", label: "Achievements", section: "achievements", comingSoon: true },
];

export function dashboardLinksForUser(user?: User | null) {
  const primary = [...PLATFORM_LINKS];

  // Admin-only tools
  if (isAdmin(user)) {
    primary.push({ to: "/admin/users", label: "Users", section: "users" });
    primary.push({ to: "/admin/contact-inbox", label: "Mail", section: "contact" });
  }

  return { primary, phase2: PHASE2_LINKS };
}
