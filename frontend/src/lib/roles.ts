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

export function dashboardLinksForUser(user?: User | null) {
  const role = normalizeRole(user?.role);
  const intent = user?.onboarding_intent || "build_portfolio";

  const all = [
    { to: "/admin/profile", label: "Professional Profile", section: "profile" },
    { to: "/admin/projects", label: "Projects", section: "projects" },
    { to: "/admin/portfolio-builder", label: "Portfolio Builder", section: "portfolio" },
    { to: "/admin/case-studies", label: "Case Studies", section: "case-studies" },
    { to: "/admin/media", label: "Media Library", section: "media" },
    { to: "/admin/notifications", label: "Notifications", section: "notifications" },
  ];

  const phase2 = [
    { to: "#", label: "Resume Builder", section: "resume", comingSoon: true },
    { to: "#", label: "Career Timeline", section: "timeline", comingSoon: true },
    { to: "#", label: "Achievements", section: "achievements", comingSoon: true },
    { to: "#", label: "Analytics", section: "analytics", comingSoon: true },
  ];

  if (role === "admin") {
    all.push({ to: "/admin/contact-inbox", label: "Contact Inbox", section: "contact" });
  }

  const priority =
    intent === "publish_case_studies"
      ? ["case-studies", "projects", "portfolio", "profile"]
      : intent === "track_career"
        ? ["projects", "profile", "portfolio", "case-studies"]
        : ["portfolio", "profile", "projects", "case-studies"];

  const sorted = [...all].sort((a, b) => {
    const aIndex = priority.indexOf(a.section);
    const bIndex = priority.indexOf(b.section);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });

  return { primary: sorted, phase2 };
}
