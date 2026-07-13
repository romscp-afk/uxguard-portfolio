import type {
  CaseStudy,
  ContentBlock,
  PortfolioBuilderConfig,
  PortfolioTheme,
  Project,
  TemplateCategory,
  TemplateDefinition,
} from "../types";

function block(
  type: ContentBlock["type"],
  data: Record<string, unknown>,
): ContentBlock {
  return {
    id: `tpl_${Math.random().toString(36).slice(2, 9)}`,
    type,
    data,
  };
}

const CASE_STUDY_TEMPLATES: TemplateDefinition[] = [
  {
    id: "cs-evidence-arc",
    category: "case_study",
    name: "Evidence Arc",
    tagline: "Problem → Method → Artifacts → Impact",
    description:
      "The UXGuard signature narrative. Built for researchers who want hiring managers to see rigor, not just pretty screenshots.",
    badge: "Signature",
    accent: "teal",
    audience: "Hiring managers & research leads",
    rigorHints: ["Challenge framed as a business risk", "Named methods", "Evidence block", "Measurable impact"],
    previewSections: ["Challenge", "Methodology", "Findings", "Impact", "Reflections"],
    caseStudy: {
      title: "Evidence Arc Case Study",
      subtitle: "How research changed a product decision",
      project_type: "UX Research",
      role: "Lead Researcher",
      duration: "6 weeks",
      summary:
        "We investigated why users abandoned a critical flow, validated the root cause with mixed methods, and shipped a redesign that improved completion and confidence.",
      challenge:
        "[Describe the business or product risk.]\n\nUsers were dropping out of [flow]. Stakeholders assumed [assumption]. We needed evidence before investing in a redesign.",
      methodology:
        "We ran a mixed-methods plan: discovery interviews to surface mental models, moderated usability tests on the current flow, and analytics review to quantify drop-off. Findings were triangulated before recommending changes.",
      impact:
        "[Replace with your metrics.]\n\nExample: Task success rose from X% → Y%. Support tickets for this flow dropped Z%. Stakeholders approved the redesign with higher confidence.",
      reflections:
        "What we would do differently: recruit earlier, instrument the funnel before testing, and socialize findings mid-study so stakeholders are not surprised.",
      methods: ["User Interviews", "Usability Testing", "Analytics Review"],
      metrics: [
        { label: "Task success", value: "+X%", description: "Before → after" },
        { label: "Time on task", value: "-Xm", description: "Median reduction" },
        { label: "Stakeholder confidence", value: "High", description: "Decision readiness" },
      ],
      content_blocks: [
        block("findings", {
          items: [
            {
              statement: "Users misunderstood the primary action because the label matched a different mental model.",
              evidence: "6/8 participants paused or misclicked on the CTA during moderated tests.",
            },
            {
              statement: "Trust cues were missing at the highest-friction step.",
              evidence: "Interview participants asked for reassurance language before submitting.",
            },
          ],
        }),
        block("quote", {
          text: "I thought I already finished — I didn't realize there was another step.",
          attribution: "Participant P4",
        }),
        block("text", {
          heading: "Artifacts & recommendations",
          body: "Link or describe journey maps, test scripts, findings decks, and the prioritized recommendation list stakeholders used to decide.",
        }),
      ],
      status: "draft",
      featured: true,
    },
  },
  {
    id: "cs-discovery-sprint",
    category: "case_study",
    name: "Discovery Sprint",
    tagline: "2-week problem framing for product teams",
    description:
      "Ideal when you need to show how research de-risked a roadmap bet before design or build started.",
    badge: "Fast",
    accent: "ink",
    audience: "PMs & founders",
    rigorHints: ["Problem statement", "Assumptions log", "Opportunity areas", "Go / no-go recommendation"],
    previewSections: ["Assumptions", "Interviews", "Opportunities", "Recommendation"],
    caseStudy: {
      title: "Discovery Sprint",
      subtitle: "Framing the right problem before we design",
      project_type: "Product Discovery",
      role: "UX Researcher",
      duration: "2 weeks",
      summary:
        "A short discovery sprint clarified who the product is for, which jobs matter most, and which opportunity is worth pursuing next.",
      challenge:
        "The team had three competing product bets and limited runway. We needed a shared problem definition and a clear recommendation within two weeks.",
      methodology:
        "Stakeholder alignment workshop → assumption mapping → 8 discovery interviews → synthesis into jobs, pains, and opportunity areas → readout with a recommended bet.",
      impact:
        "Aligned leadership on one opportunity, killed two low-confidence bets, and created a research backlog for the next quarter.",
      reflections:
        "Next time: include a sales or CS partner in synthesis so commercial context lands earlier.",
      methods: ["Stakeholder Interviews", "Discovery Interviews", "Survey"],
      metrics: [
        { label: "Interviews", value: "8", description: "Target users + buyers" },
        { label: "Bets killed", value: "2", description: "Low-evidence ideas" },
        { label: "Decision time", value: "2 wks", description: "Idea → recommendation" },
      ],
      content_blocks: [
        block("text", {
          heading: "Assumptions we tested",
          body: "List the riskiest assumptions and how each interview challenged or supported them.",
        }),
        block("findings", {
          items: [
            {
              statement: "Users already cobble together a workaround — they don't need a full platform yet.",
              evidence: "5/8 described a spreadsheet + chat stack as 'good enough for now'.",
            },
          ],
        }),
      ],
      status: "draft",
      featured: false,
    },
  },
  {
    id: "cs-usability-lab",
    category: "case_study",
    name: "Usability Lab Report",
    tagline: "Task-based findings hiring managers trust",
    description:
      "Structured like a lab report: tasks, severity ratings, evidence clips, and prioritized fixes.",
    badge: "Classic",
    accent: "amber",
    audience: "Design & engineering partners",
    rigorHints: ["Task list", "Severity scale", "Issue → recommendation", "Retest plan"],
    previewSections: ["Tasks", "Issues", "Severity", "Fixes"],
    caseStudy: {
      title: "Usability Lab Report",
      subtitle: "Moderated testing of [product / flow]",
      project_type: "Usability Testing",
      role: "UX Researcher",
      duration: "3 weeks",
      summary:
        "Moderated usability sessions uncovered high-severity barriers in a core workflow. We ranked issues by severity and ownership, then retested critical paths.",
      challenge:
        "[Product] needed proof that the redesigned flow was usable before launch. Prior feedback was anecdotal and conflicting.",
      methodology:
        "Recruitment of N participants matching the persona. Think-aloud moderated sessions on prototype / production. Severity scoring (S0–S3). Affinity synthesis and prioritized backlog for design + eng.",
      impact:
        "Critical issues fixed before launch. Retest showed improved task success on the primary path.",
      reflections:
        "Recording consent and a shared observation sheet made stakeholder alignment much faster.",
      methods: ["Usability Testing", "Unmoderated Testing"],
      metrics: [
        { label: "Participants", value: "N", description: "Target persona" },
        { label: "Critical issues", value: "X", description: "S0 / S1 found" },
        { label: "Task success", value: "Y%", description: "Primary task" },
      ],
      content_blocks: [
        block("text", {
          heading: "Tasks tested",
          body: "1. Find and start [action]\n2. Complete [core task]\n3. Recover from an error state",
        }),
        block("findings", {
          items: [
            {
              statement: "S1 — Users could not locate the primary action without help.",
              evidence: "Observed in N sessions; average time-to-find exceeded success criteria.",
            },
          ],
        }),
        block("quote", {
          text: "I know what I want to do, but I can't tell which button does it.",
          attribution: "Participant",
        }),
      ],
      status: "draft",
      featured: false,
    },
  },
  {
    id: "cs-a11y-audit",
    category: "case_study",
    name: "Accessibility Evidence Study",
    tagline: "WCAG findings with human impact stories",
    description:
      "Pairs audit results with lived-experience research — a differentiator most portfolio sites never surface.",
    badge: "Unique",
    accent: "violet",
    audience: "Inclusive design advocates & compliance stakeholders",
    rigorHints: ["WCAG criteria mapped", "Assistive tech sessions", "Remediation owners", "Before/after"],
    previewSections: ["Audit scope", "AT sessions", "Gaps", "Remediation"],
    caseStudy: {
      title: "Accessibility Evidence Study",
      subtitle: "From checklist findings to inclusive experience",
      project_type: "Accessibility Research",
      role: "UX Researcher",
      duration: "4 weeks",
      summary:
        "We combined automated and manual WCAG review with assistive-technology sessions to prioritize remediations that unblock real users — not just pass an audit.",
      challenge:
        "The product risked excluding users and failing compliance targets. Prior audits produced long issue lists without clear impact or ownership.",
      methodology:
        "Scope critical journeys → automated scan + expert review against WCAG 2.2 AA → sessions with screen reader and keyboard-only users → severity × frequency prioritization → remediation plan with owners.",
      impact:
        "Top blockers remediated on the conversion path. Keyboard and screen-reader task completion improved in retest.",
      reflections:
        "Pairing AT sessions with engineering in the room turned findings into fixes the same sprint.",
      methods: ["Usability Testing", "Analytics Review", "Concept Testing"],
      metrics: [
        { label: "Critical a11y issues", value: "X", description: "Blockers fixed" },
        { label: "AT sessions", value: "N", description: "Screen reader / keyboard" },
        { label: "WCAG coverage", value: "AA", description: "Target level" },
      ],
      content_blocks: [
        block("findings", {
          items: [
            {
              statement: "Focus order skipped the primary CTA after dialog close.",
              evidence: "Keyboard-only users lost place; screen reader users re-announced the page top.",
            },
          ],
        }),
        block("text", {
          heading: "Remediation plan",
          body: "Map each issue to WCAG criterion, owner, and target sprint. Include before/after clips when possible.",
        }),
      ],
      status: "draft",
      featured: false,
    },
  },
  {
    id: "cs-mixed-methods",
    category: "case_study",
    name: "Mixed-Methods Impact Story",
    tagline: "Qual + quant triangulated for executives",
    description:
      "Shows how you weave survey, analytics, and interviews into one decision narrative executives can act on.",
    badge: "Exec-ready",
    accent: "teal",
    audience: "Executives & research ops",
    rigorHints: ["Triangulation", "Confidence statement", "Decision asked", "Follow-up research"],
    previewSections: ["Signals", "Synthesis", "Decision", "Next bets"],
    caseStudy: {
      title: "Mixed-Methods Impact Story",
      subtitle: "Triangulating signals into one decision",
      project_type: "Strategic Research",
      role: "Senior UX Researcher",
      duration: "8 weeks",
      summary:
        "Analytics showed a drop, support tickets hinted at confusion, and interviews explained why. Together they unlocked a clear product decision.",
      challenge:
        "Leadership received conflicting signals from analytics, CS, and design intuition. They needed one evidence-backed recommendation.",
      methodology:
        "Funnel analytics → support ticket coding → targeted survey → follow-up interviews → synthesis workshop with PM/Design → decision brief.",
      impact:
        "Leadership chose Option B with documented confidence. Roadmap updated; follow-up study scheduled post-launch.",
      reflections:
        "A one-page decision brief outperformed a long deck for exec readouts.",
      methods: ["Analytics Review", "Survey", "User Interviews", "Stakeholder Interviews"],
      metrics: [
        { label: "Survey n", value: "N", description: "Respondents" },
        { label: "Interviews", value: "N", description: "Deep dives" },
        { label: "Decision confidence", value: "High", description: "Stakeholder rating" },
      ],
      content_blocks: [
        block("text", {
          heading: "How signals lined up",
          body: "Show the triangulation table: analytics signal → survey pattern → interview explanation.",
        }),
        block("quote", {
          text: "Now I understand why the chart dipped — and what to do about it.",
          attribution: "Product lead",
        }),
      ],
      status: "draft",
      featured: true,
    },
  },
];

const THEME_TEMPLATES: TemplateDefinition[] = [
  {
    id: "theme-evidence-lab",
    category: "theme",
    name: "Evidence Lab",
    tagline: "Research-first portfolio layout",
    description:
      "Dark hero, stats that feel like a lab dashboard, case studies framed as impact stories. Signature UXGuard look.",
    badge: "Default+",
    accent: "teal",
    audience: "UX researchers",
    rigorHints: ["Stats band", "Impact-first case grid", "Evidence tone"],
    previewSections: ["Lab hero", "Proof stats", "Impact stories"],
    theme: "evidence_lab",
    portfolioConfig: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
    },
  },
  {
    id: "theme-hiring-signal",
    category: "theme",
    name: "Hiring Signal",
    tagline: "Optimized for recruiters scanning fast",
    description:
      "Headline-forward layout with featured case studies up top and a crisp bio. Built for LinkedIn traffic that lands and decides in seconds.",
    badge: "Recruiter",
    accent: "ink",
    audience: "Job seekers",
    rigorHints: ["Featured work first", "Tight bio", "Clear CTA"],
    previewSections: ["Signal hero", "Featured work", "More studies"],
    theme: "hiring_signal",
    portfolioConfig: {
      show_profile: true,
      show_projects: false,
      show_case_studies: true,
    },
  },
  {
    id: "theme-research-journal",
    category: "theme",
    name: "Research Journal",
    tagline: "Editorial, long-form storytelling",
    description:
      "Magazine-like reading experience. Ideal when your case studies are narrative-heavy and you want depth over density.",
    badge: "Editorial",
    accent: "amber",
    audience: "Senior researchers & writers",
    rigorHints: ["Editorial typography", "Single-column rhythm", "Quiet chrome"],
    previewSections: ["Journal masthead", "Essays", "Projects footnote"],
    theme: "research_journal",
    portfolioConfig: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
    },
  },
  {
    id: "theme-impact-gallery",
    category: "theme",
    name: "Impact Gallery",
    tagline: "Visual-first project & study mosaic",
    description:
      "Large covers, outcome chips, and a mosaic of work. Perfect when your artifacts and visuals do the talking.",
    badge: "Visual",
    accent: "violet",
    audience: "Design researchers & hybrid roles",
    rigorHints: ["Large covers", "Outcome chips", "Mosaic grid"],
    previewSections: ["Gallery hero", "Project mosaic", "Case mosaic"],
    theme: "impact_gallery",
    portfolioConfig: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
    },
  },
];

const STARTER_KITS: TemplateDefinition[] = [
  {
    id: "kit-researcher-launch",
    category: "starter_kit",
    name: "Researcher Launch Kit",
    tagline: "Bio + project + Evidence Arc case study in one click",
    description:
      "Instant portfolio foundation: polished bio prompts, a sample research project, and an Evidence Arc draft ready to personalize — then open UXGuard AI to finish.",
    badge: "One-click",
    accent: "teal",
    audience: "New UXGuard members",
    rigorHints: ["Profile copy", "Flagship project", "Signature case draft", "Evidence Lab theme"],
    previewSections: ["Profile", "Project", "Case study", "Theme"],
    theme: "evidence_lab",
    portfolioConfig: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
    },
    profile: {
      title: "UX Researcher | Evidence-driven product discovery",
      bio: "I help product teams reduce risk with rigorous research — from discovery sprints to usability labs. I turn messy signals into decisions leaders can trust.",
    },
    project: {
      title: "Flagship Research Program",
      client: "Your company or client",
      status: "active",
      role: "Lead UX Researcher",
      description:
        "End-to-end research program covering discovery, evaluative testing, and stakeholder readout rituals that keep product decisions evidence-backed.",
      tags: ["UX Research", "Discovery", "Usability"],
      team: ["PM", "Designer", "Engineer"],
      outcomes: [
        { label: "Studies shipped", value: "3+", description: "This quarter" },
        { label: "Decisions influenced", value: "High", description: "Roadmap impact" },
      ],
    },
    caseStudy: CASE_STUDY_TEMPLATES[0].caseStudy,
  },
  {
    id: "kit-job-hunt",
    category: "starter_kit",
    name: "Job Hunt Spotlight",
    tagline: "Hiring Signal theme + 2 case scaffolds",
    description:
      "Recruiter-optimized portfolio: Hiring Signal theme, usability lab draft, and mixed-methods draft so you can publish two strong stories quickly.",
    badge: "Career",
    accent: "ink",
    audience: "Researchers on the market",
    rigorHints: ["Hiring Signal theme", "Usability draft", "Exec-ready draft"],
    previewSections: ["Theme", "Usability study", "Mixed-methods study"],
    theme: "hiring_signal",
    portfolioConfig: {
      show_profile: true,
      show_projects: false,
      show_case_studies: true,
    },
    profile: {
      title: "UX Researcher open to senior / lead roles",
      bio: "I specialize in mixed-methods research that ships. Looking for teams that value evidence, inclusion, and clear storytelling with stakeholders.",
    },
    caseStudies: [CASE_STUDY_TEMPLATES[2].caseStudy!, CASE_STUDY_TEMPLATES[4].caseStudy!],
  },
  {
    id: "kit-inclusive-pro",
    category: "starter_kit",
    name: "Inclusive Research Pro",
    tagline: "A11y evidence study + Journal theme",
    description:
      "Stand out with an accessibility evidence study and an editorial Research Journal layout — a combo most portfolios never offer.",
    badge: "Stand out",
    accent: "violet",
    audience: "Inclusive design researchers",
    rigorHints: ["A11y case scaffold", "Journal theme", "Inclusive positioning"],
    previewSections: ["Theme", "A11y study", "Profile"],
    theme: "research_journal",
    portfolioConfig: {
      show_profile: true,
      show_projects: true,
      show_case_studies: true,
    },
    profile: {
      title: "UX Researcher | Accessibility & inclusive experiences",
      bio: "I connect WCAG rigor with lived-experience research so teams fix what actually blocks people — not just what scanners flag.",
    },
    caseStudy: CASE_STUDY_TEMPLATES[3].caseStudy,
  },
];

export const ALL_TEMPLATES: TemplateDefinition[] = [
  ...STARTER_KITS,
  ...THEME_TEMPLATES,
  ...CASE_STUDY_TEMPLATES,
];

export const TEMPLATE_CATEGORIES: {
  id: TemplateCategory | "all";
  label: string;
  description: string;
}[] = [
  { id: "all", label: "All", description: "Everything" },
  {
    id: "starter_kit",
    label: "Starter kits",
    description: "One-click portfolio foundations",
  },
  {
    id: "theme",
    label: "Portfolio themes",
    description: "Layouts recruiters remember",
  },
  {
    id: "case_study",
    label: "Case study scaffolds",
    description: "Research narratives with rigor built in",
  },
];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory | "all"): TemplateDefinition[] {
  if (category === "all") return ALL_TEMPLATES;
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

export function themeLabel(theme?: PortfolioTheme | null): string {
  switch (theme) {
    case "hiring_signal":
      return "Hiring Signal";
    case "research_journal":
      return "Research Journal";
    case "impact_gallery":
      return "Impact Gallery";
    case "evidence_lab":
    default:
      return "Evidence Lab";
  }
}

export type ApplyTemplateResult = {
  createdCaseStudyIds: number[];
  createdProjectId?: number;
  themeApplied?: PortfolioTheme;
  profileUpdated: boolean;
  message: string;
};

export function stripCaseStudyForCreate(
  draft: Partial<CaseStudy>,
): Partial<CaseStudy> {
  return {
    title: draft.title,
    subtitle: draft.subtitle,
    client: draft.client,
    project_type: draft.project_type,
    role: draft.role,
    duration: draft.duration,
    summary: draft.summary,
    challenge: draft.challenge,
    methodology: draft.methodology,
    impact: draft.impact,
    reflections: draft.reflections,
    methods: draft.methods || [],
    metrics: draft.metrics || [],
    content_blocks: (draft.content_blocks || []).map((b) => ({
      ...b,
      id: `tpl_${Math.random().toString(36).slice(2, 9)}`,
    })),
    status: "draft",
    featured: Boolean(draft.featured),
    sort_order: 0,
  };
}

export function stripProjectForCreate(draft: Partial<Project>): Partial<Project> {
  return {
    title: draft.title,
    client: draft.client,
    status: draft.status || "active",
    description: draft.description,
    role: draft.role,
    tags: draft.tags || [],
    team: draft.team || [],
    outcomes: draft.outcomes || [],
  };
}

export function portfolioUpdatesFromTemplate(
  template: TemplateDefinition,
): Partial<PortfolioBuilderConfig> {
  return {
    ...(template.portfolioConfig || {}),
    ...(template.theme ? { theme: template.theme } : {}),
  };
}
