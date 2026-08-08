import type { User } from "../types";

export type PlatformRole = "admin" | "professional" | "viewer";
export type OnboardingIntent = "build_portfolio" | "track_career" | "publish_case_studies";

/**
 * Portfolio launch mode: non-admin users only see Dashboard, Portfolio, and Account.
 * Admins retain the full platform. Flip to false when rolling features back out.
 */
export const PORTFOLIO_LAUNCH_ONLY = true;

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

/** Intents shown on registration (portfolio launch = build portfolio only). */
export const INTENT_OPTIONS = PORTFOLIO_LAUNCH_ONLY
  ? [
      {
        id: "build_portfolio" as const,
        title: "Build my portfolio",
        description: "Organize projects, case studies, and your public portfolio page.",
      },
    ]
  : [
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
  ...(PORTFOLIO_LAUNCH_ONLY
    ? []
    : [
        {
          id: "viewer" as const,
          title: "Viewer",
          description: "Read-only access to explore the platform and community.",
        },
      ]),
];

export type NavLink = {
  to: string;
  label: string;
  section: string;
  comingSoon?: boolean;
  adminOnly?: boolean;
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
      { to: "/admin/articles", label: "Articles", section: "articles" },
      { to: "/admin/templates", label: "Templates", section: "templates" },
      { to: "/admin/media", label: "Media Library", section: "media" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    links: [
      { to: "/admin/ai", label: "UXGuard AI", section: "ai" },
      { to: "/admin/testlab", label: "TestLab", section: "testlab", adminOnly: true },
      { to: "/admin/analytics", label: "Analytics", section: "analytics" },
    ],
  },
  {
    id: "account",
    label: "Account",
    links: [
      { to: "/admin/messages", label: "Messages", section: "messages" },
      { to: "/admin/billing", label: "Billing", section: "billing" },
      { to: "/admin/notifications", label: "Notifications", section: "notifications" },
    ],
  },
];

/** Non-admin nav during portfolio launch. */
const PORTFOLIO_LAUNCH_GROUPS: NavGroup[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    links: [
      { to: "/admin/portfolio-builder", label: "Portfolio Builder", section: "portfolio" },
      { to: "/admin/projects", label: "Projects", section: "projects" },
      { to: "/admin/case-studies", label: "Case Studies", section: "case-studies" },
      { to: "/admin/articles", label: "Articles", section: "articles" },
      { to: "/admin/templates", label: "Templates", section: "templates" },
      { to: "/admin/media", label: "Media Library", section: "media" },
    ],
  },
  {
    id: "account",
    label: "Account",
    links: [
      { to: "/admin/profile", label: "Profile", section: "profile" },
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
      { to: "/admin/messages", label: "Messages", section: "messages" },
      { to: "/admin/billing", label: "Billing", section: "billing" },
      { to: "/admin/notifications", label: "Notifications", section: "notifications" },
    ],
  },
];

const PHASE2_LINKS: NavLink[] = [
  { to: "#", label: "Achievements", section: "achievements", comingSoon: true },
];

/** Path prefixes non-admins may open during portfolio launch. */
export const PORTFOLIO_LAUNCH_ALLOWED_PREFIXES = [
  "/admin",
  "/admin/profile",
  "/admin/portfolio-builder",
  "/admin/projects",
  "/admin/case-studies",
  "/admin/articles",
  "/admin/templates",
  "/admin/media",
  "/admin/billing",
  "/admin/notifications",
  "/admin/upgrade",
  "/admin/login",
  "/admin/register",
  "/admin/forgot-password",
  "/admin/reset-password",
  "/checkout",
];

export function isPortfolioLaunchPathAllowed(pathname: string): boolean {
  if (!PORTFOLIO_LAUNCH_ONLY) return true;
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  // Exact dashboard
  if (path === "/admin") return true;

  // Case study editor / project detail under allowed sections
  const allowed = [
    "/admin/profile",
    "/admin/portfolio-builder",
    "/admin/projects",
    "/admin/case-studies",
    "/admin/articles",
    "/admin/templates",
    "/admin/media",
    "/admin/billing",
    "/admin/notifications",
    "/admin/upgrade",
    "/admin/login",
    "/admin/register",
    "/admin/forgot-password",
    "/admin/reset-password",
    "/checkout",
  ];

  return allowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function dashboardLinksForUser(user?: User | null) {
  // During portfolio launch, non-admins never enter the employer workspace.
  const employerSession =
    !PORTFOLIO_LAUNCH_ONLY &&
    !isAdmin(user) &&
    Boolean(user?.workspaces?.employer) &&
    (user?.account_type === "employer" || user?.last_login_portal === "employer");
  const workspace = employerSession ? "employer" : "candidate";

  let groups: NavGroup[];
  if (!isAdmin(user) && PORTFOLIO_LAUNCH_ONLY) {
    groups = PORTFOLIO_LAUNCH_GROUPS.map((g) => ({ ...g, links: [...g.links] }));
  } else if (workspace === "employer") {
    groups = EMPLOYER_GROUPS.map((g) => ({ ...g, links: [...g.links] }));
  } else {
    groups = CANDIDATE_GROUPS.map((g) => ({
      ...g,
      links: g.links.filter((link) => !link.adminOnly || isAdmin(user)),
    }));
  }

  if (isAdmin(user) && workspace === "candidate") {
    groups.push({
      id: "admin",
      label: "Admin",
      links: [
        { to: "/admin/users", label: "Users", section: "users" },
        { to: "/admin/employers", label: "Employers", section: "employers" },
        { to: "/admin/contact-inbox", label: "Mail", section: "contact" },
      ],
    });
  }

  const primary = groups.flatMap((g) => g.links);

  return {
    groups,
    primary,
    phase2: workspace === "candidate" && isAdmin(user) ? PHASE2_LINKS : [],
    workspace,
  };
}
