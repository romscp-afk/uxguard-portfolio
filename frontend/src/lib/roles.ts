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

export type NavLink = {
  to: string;
  label: string;
  section: string;
  comingSoon?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  links: NavLink[];
};

const CANDIDATE_GROUPS: NavGroup[] = [
  {
    id: "career",
    label: "Career",
    links: [
      { to: "/admin/resume-builder", label: "Resume Builder", section: "resume" },
      { to: "/admin/career-timeline", label: "Career Timeline", section: "timeline" },
      { to: "/admin/profile", label: "Profile", section: "profile" },
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    links: [
      { to: "/admin/jobs", label: "Jobs", section: "jobs" },
      { to: "/admin/applications", label: "My Applications", section: "applications" },
      { to: "/admin/saved-jobs", label: "Saved Jobs", section: "saved" },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    links: [
      { to: "/admin/portfolio-builder", label: "Portfolio Builder", section: "portfolio" },
      { to: "/admin/projects", label: "Projects", section: "projects" },
      { to: "/admin/case-studies", label: "Case Studies", section: "case-studies" },
      { to: "/admin/templates", label: "Templates", section: "templates" },
      { to: "/admin/media", label: "Media Library", section: "media" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    links: [
      { to: "/admin/ai", label: "UXGuard AI", section: "ai" },
      { to: "/admin/analytics", label: "Analytics", section: "analytics" },
    ],
  },
  {
    id: "account",
    label: "Account",
    links: [
      { to: "/admin/billing", label: "Billing", section: "billing" },
      { to: "/admin/notifications", label: "Notifications", section: "notifications" },
    ],
  },
];

const EMPLOYER_GROUPS: NavGroup[] = [
  {
    id: "hiring",
    label: "Hiring",
    links: [
      { to: "/admin/employer", label: "Dashboard", section: "employer" },
      { to: "/admin/employer/jobs/new", label: "Post a Job", section: "post-job" },
    ],
  },
  {
    id: "account",
    label: "Account",
    links: [
      { to: "/admin/billing", label: "Billing", section: "billing" },
      { to: "/admin/notifications", label: "Notifications", section: "notifications" },
    ],
  },
];

const PHASE2_LINKS: NavLink[] = [
  { to: "#", label: "Achievements", section: "achievements", comingSoon: true },
];

export function dashboardLinksForUser(user?: User | null) {
  const workspace = user?.active_workspace === "employer" ? "employer" : "candidate";
  const groups =
    workspace === "employer"
      ? EMPLOYER_GROUPS.map((g) => ({ ...g, links: [...g.links] }))
      : CANDIDATE_GROUPS.map((g) => ({ ...g, links: [...g.links] }));

  if (isAdmin(user) && workspace === "candidate") {
    groups.push({
      id: "admin",
      label: "Admin",
      links: [
        { to: "/admin/users", label: "Users", section: "users" },
        { to: "/admin/contact-inbox", label: "Mail", section: "contact" },
      ],
    });
  }

  // Flat list kept for any callers that still expect `primary`
  const primary = groups.flatMap((g) => g.links);

  return {
    groups,
    primary,
    phase2: workspace === "candidate" ? PHASE2_LINKS : [],
    workspace,
  };
}
