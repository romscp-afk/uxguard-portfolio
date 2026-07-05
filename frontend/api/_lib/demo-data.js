const now = "2026-07-04T19:26:59.000Z";

export const users = [
  {
    id: 1,
    email: "demo@uxguard.io",
    password: "demo1234",
    username: "alex-rivera",
    name: "Alex Rivera",
    title: "Senior UX Researcher",
    bio: "I help product teams make evidence-based decisions through mixed-methods research.",
    avatar_url: null,
    contact_email: "alex@uxguard.io",
    location: "San Francisco, CA",
    cv_url: null,
    social_links: { linkedin: "https://linkedin.com/in/alexrivera" },
    role: "admin",
  },
  {
    id: 2,
    email: "jordan@uxguard.io",
    password: "demo1234",
    username: "jordan-kim",
    name: "Jordan Kim",
    title: "UX Research Lead",
    bio: "Mixed-methods researcher focused on B2B SaaS onboarding and activation.",
    avatar_url: null,
    contact_email: "jordan@uxguard.io",
    location: "New York, NY",
    cv_url: null,
    social_links: { linkedin: "https://linkedin.com/in/jordankim" },
    role: "researcher",
  },
];

export const portfolioSettings = {
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

export const caseStudies = [
  {
    id: 1,
    slug: "checkout-usability-study",
    title: "Checkout Usability Study",
    subtitle: "Reducing cart abandonment through moderated usability testing",
    client: "FinFlow",
    project_type: "B2B SaaS",
    role: "Lead UX Researcher",
    duration: "6 weeks",
    summary: "A mixed-methods study to understand why enterprise users abandoned checkout at the payment step.",
    challenge: "Cart abandonment at payment was 34% above industry benchmark.",
    methodology: "8 moderated usability sessions, 120-session analytics review, and 5 stakeholder interviews.",
    impact: "Payment-step completion improved 22%, support tickets for billing dropped 18% in 90 days.",
    reflections: "Recruiting enterprise admins took longer than expected.",
    cover_image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    methods: ["Usability Testing", "Analytics Review", "Stakeholder Interviews"],
    metrics: [
      { label: "Completion lift", value: "+22%", description: "Payment step" },
      { label: "Support reduction", value: "-18%", description: "Billing tickets" },
    ],
    content_blocks: [
      {
        id: "b1",
        type: "text",
        data: { heading: "Research Goals", body: "Identify friction points in the checkout flow." },
      },
      {
        id: "b2",
        type: "quote",
        data: {
          text: "I wasn't sure if my card would be charged immediately.",
          attribution: "Participant P4",
        },
      },
    ],
    status: "published",
    featured: true,
    sort_order: 1,
    author_id: 1,
    created_at: now,
    updated_at: now,
    published_at: now,
    attachments: [],
  },
  {
    id: 2,
    slug: "onboarding-diary-study",
    title: "Onboarding Diary Study",
    subtitle: "Understanding first-week activation for new mobile users",
    client: "HealthTrack",
    project_type: "Consumer Mobile",
    role: "UX Researcher",
    duration: "4 weeks",
    summary: "A 7-day diary study with 20 new users to map onboarding confusion.",
    challenge: "Day-7 retention was 41%.",
    methodology: "Diary study with daily prompts and follow-up interviews.",
    impact: "Day-7 retention improved from 41% to 53%.",
    reflections: "Daily prompts worked well.",
    cover_image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    methods: ["Diary Study", "Unmoderated Testing", "Interviews"],
    metrics: [{ label: "Day-7 retention", value: "+12pts", description: "After 2 releases" }],
    content_blocks: [],
    status: "published",
    featured: true,
    sort_order: 2,
    author_id: 1,
    created_at: now,
    updated_at: now,
    published_at: now,
    attachments: [],
  },
  {
    id: 3,
    slug: "enterprise-admin-research",
    title: "Enterprise Admin Research",
    subtitle: "Mapping admin workflows for multi-tenant SaaS",
    client: "CloudOps",
    project_type: "B2B SaaS",
    role: "Lead Researcher",
    duration: "6 weeks",
    summary: "Contextual inquiry and workflow mapping with IT admins to redesign permission tooling.",
    challenge: "Admins spent 40+ minutes on routine permission changes with high error rates.",
    methodology: "Contextual inquiry, service blueprinting, and prototype validation.",
    impact: "Admin task time reduced by 58% after permission model redesign.",
    reflections: "Shadowing in production environments surfaced edge cases surveys missed.",
    cover_image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80",
    methods: ["Contextual Inquiry", "Workflow Mapping", "Prototype Testing"],
    metrics: [
      { label: "Task time", value: "-58%", description: "Permission changes" },
      { label: "Admins", value: "14", description: "Interviewed" },
    ],
    content_blocks: [],
    status: "published",
    featured: false,
    sort_order: 1,
    author_id: 2,
    created_at: now,
    updated_at: now,
    published_at: now,
    attachments: [],
  },
];

export function getUserById(id) {
  return users.find((u) => u.id === id) || null;
}

export function getUserByUsername(username) {
  return users.find((u) => u.username === username) || null;
}

export function getUserByEmail(email) {
  return users.find((u) => u.email === email) || null;
}

function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "researcher"
  );
}

function uniqueUsername(base) {
  let candidate = slugify(base);
  let counter = 1;
  while (getUserByUsername(candidate)) {
    candidate = `${slugify(base)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export function registerUser({ email, password, name, username, title }) {
  if (!email || !password || !name) {
    return { error: "Name, email, and password are required", status: 400 };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }
  if (getUserByEmail(email)) {
    return { error: "Email already registered", status: 400 };
  }

  const finalUsername = username ? slugify(username) : uniqueUsername(name);
  if (username && getUserByUsername(finalUsername)) {
    return { error: "Username already taken", status: 400 };
  }

  const id = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  const user = {
    id,
    email,
    password,
    username: finalUsername,
    name,
    title: title || null,
    bio: null,
    avatar_url: null,
    contact_email: email,
    location: null,
    cv_url: null,
    social_links: {},
    role: "researcher",
  };
  users.push(user);
  return { user };
}

export function toUserOut(user) {
  const { password: _password, ...rest } = user;
  return { ...rest, portfolio_url: `/u/${user.username}` };
}

export function authorSummary(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    title: user.title,
    avatar_url: user.avatar_url,
  };
}

export function toListItem(cs) {
  return {
    id: cs.id,
    slug: cs.slug,
    title: cs.title,
    subtitle: cs.subtitle,
    client: cs.client,
    cover_image: cs.cover_image,
    methods: cs.methods,
    featured: cs.featured,
    status: cs.status,
    updated_at: cs.updated_at,
  };
}

export function getFeedItems() {
  return caseStudies
    .filter((cs) => cs.status === "published")
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .map((cs) => {
      const author = getUserById(cs.author_id);
      return {
        ...toListItem(cs),
        published_at: cs.published_at,
        author: author ? authorSummary(author) : null,
      };
    });
}

export function getUserProfile(username) {
  const user = getUserByUsername(username);
  if (!user) return null;
  const studies = caseStudies
    .filter((cs) => cs.author_id === user.id && cs.status === "published")
    .sort((a, b) => a.sort_order - b.sort_order);
  const { password: _password, ...publicUser } = user;
  return {
    ...publicUser,
    case_studies: studies.map(toListItem),
    case_study_count: studies.length,
  };
}

export function getUserCaseStudy(username, slug) {
  const user = getUserByUsername(username);
  if (!user) return null;
  return (
    caseStudies.find(
      (cs) => cs.author_id === user.id && cs.slug === slug && cs.status === "published",
    ) || null
  );
}

/** @deprecated use getUserByEmail */
export const demoUser = users[0];
