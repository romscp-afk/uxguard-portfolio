import type { AiAssistantType } from "../types";

export type AiFormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  placeholder?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
  rows?: number;
};

export type AiActionDef = {
  id: string;
  label: string;
  description: string;
  credits: number;
};

export type AiAssistantDef = {
  id: AiAssistantType;
  name: string;
  description: string;
  accent: string;
  actions: AiActionDef[];
  fields: AiFormField[];
  defaultAction: string;
};

export const AI_ASSISTANTS: AiAssistantDef[] = [
  {
    id: "case-study",
    name: "Case Study Builder",
    description:
      "Transform project information and rough notes into a structured professional UX case study.",
    accent: "from-brand-600 to-brand-800",
    defaultAction: "generate-complete",
    actions: [
      { id: "generate-complete", label: "Create complete case study", description: "Full structured narrative", credits: 5 },
      { id: "generate-section", label: "Generate individual section", description: "Focus on one section", credits: 2 },
      { id: "rewrite-section", label: "Rewrite existing section", description: "Polish a section you paste", credits: 1 },
      { id: "improve-impact", label: "Improve impact statement", description: "Sharpen outcomes without inventing metrics", credits: 2 },
      { id: "generate-reflection", label: "Generate reflection and findings", description: "Honest reflections from your notes", credits: 2 },
    ],
    fields: [
      { key: "project_title", label: "Project title", type: "text", placeholder: "Checkout usability study" },
      { key: "subtitle", label: "Subtitle", type: "text", optional: true },
      { key: "client", label: "Client", type: "text", optional: true },
      { key: "industry", label: "Industry", type: "text", optional: true, placeholder: "Fintech, healthcare…" },
      { key: "project_type", label: "Project type", type: "text", optional: true, placeholder: "B2B SaaS" },
      { key: "role", label: "Your role", type: "text", placeholder: "Lead UX Researcher" },
      { key: "duration", label: "Duration", type: "text", optional: true, placeholder: "6 weeks" },
      { key: "summary", label: "Project summary", type: "textarea", rows: 3, optional: true },
      { key: "business_challenge", label: "Business challenge", type: "textarea", rows: 3, optional: true },
      { key: "user_challenge", label: "User challenge", type: "textarea", rows: 3, optional: true },
      { key: "research_activities", label: "Research activities", type: "textarea", rows: 3, optional: true },
      { key: "design_activities", label: "Design activities", type: "textarea", rows: 2, optional: true },
      { key: "stakeholders", label: "Stakeholders", type: "textarea", rows: 2, optional: true },
      { key: "key_findings", label: "Key findings", type: "textarea", rows: 3, optional: true },
      { key: "solution", label: "Solution", type: "textarea", rows: 3, optional: true },
      { key: "results", label: "Results", type: "textarea", rows: 2, optional: true },
      { key: "metrics", label: "Metrics", type: "textarea", rows: 2, optional: true, placeholder: "Only include metrics you can evidence" },
      { key: "reflections", label: "Reflections", type: "textarea", rows: 2, optional: true },
      { key: "section_focus", label: "Section to generate/rewrite (if applicable)", type: "text", optional: true, placeholder: "Impact, Findings…" },
      { key: "existing_section", label: "Existing section text (for rewrite)", type: "textarea", rows: 4, optional: true },
      {
        key: "tone",
        label: "Preferred tone",
        type: "select",
        optional: true,
        options: [
          { value: "professional", label: "Professional" },
          { value: "executive", label: "Executive" },
          { value: "narrative", label: "Narrative" },
        ],
      },
      {
        key: "length",
        label: "Preferred length",
        type: "select",
        optional: true,
        options: [
          { value: "concise", label: "Concise" },
          { value: "detailed", label: "Detailed" },
          { value: "portfolio", label: "Portfolio-ready" },
        ],
      },
    ],
  },
  {
    id: "research",
    name: "UX Research Assistant",
    description: "Create practical UX research plans and research materials.",
    accent: "from-ink-800 to-ink-950",
    defaultAction: "research-plan",
    actions: [
      { id: "research-plan", label: "Research plan", description: "Objectives, methods, timeline", credits: 3 },
      { id: "interview-questions", label: "Interview questions", description: "Neutral discovery questions", credits: 1 },
      { id: "survey-questions", label: "Survey questions", description: "Structured survey draft", credits: 1 },
      { id: "usability-script", label: "Usability testing script", description: "Tasks and observation guide", credits: 2 },
      { id: "research-summary", label: "Research summary", description: "From your notes only", credits: 3 },
      { id: "findings-recommendations", label: "Findings and recommendations", description: "Actionable synthesis", credits: 3 },
    ],
    fields: [
      { key: "research_objective", label: "Research objective", type: "textarea", rows: 3 },
      { key: "product_or_service", label: "Product or service", type: "text" },
      { key: "target_audience", label: "Target audience", type: "textarea", rows: 2 },
      {
        key: "research_method",
        label: "Research method",
        type: "select",
        options: [
          { value: "interviews", label: "Interviews" },
          { value: "survey", label: "Survey" },
          { value: "usability", label: "Usability testing" },
          { value: "diary", label: "Diary study" },
          { value: "mixed", label: "Mixed methods" },
        ],
      },
      { key: "business_context", label: "Business context", type: "textarea", rows: 3, optional: true },
      { key: "known_assumptions", label: "Known assumptions", type: "textarea", rows: 2, optional: true },
      { key: "participants", label: "Number of participants", type: "text", optional: true, placeholder: "8–12" },
      { key: "notes", label: "Notes / evidence to summarise", type: "textarea", rows: 4, optional: true },
    ],
  },
  {
    id: "documentation",
    name: "Product Documentation Assistant",
    description: "Generate structured documentation for digital product teams.",
    accent: "from-amber-600 to-orange-800",
    defaultAction: "prd",
    actions: [
      { id: "prd", label: "Product requirements document", description: "Full PRD structure", credits: 6 },
      { id: "brd", label: "Business requirements document", description: "Business-focused BRD", credits: 6 },
      { id: "user-stories", label: "User stories", description: "As a / I want / so that", credits: 3 },
      { id: "acceptance-criteria", label: "Acceptance criteria", description: "Testable criteria", credits: 2 },
      { id: "feature-requirements", label: "Feature requirements", description: "Scoped feature specs", credits: 3 },
      { id: "risks-dependencies", label: "Risks and dependencies", description: "Delivery risks", credits: 2 },
    ],
    fields: [
      { key: "product_name", label: "Product name", type: "text" },
      { key: "product_vision", label: "Product vision", type: "textarea", rows: 2, optional: true },
      { key: "problem_statement", label: "Problem statement", type: "textarea", rows: 3 },
      { key: "target_users", label: "Target users", type: "textarea", rows: 2 },
      { key: "business_objective", label: "Business objective", type: "textarea", rows: 2 },
      { key: "proposed_features", label: "Proposed features", type: "textarea", rows: 3, optional: true },
      { key: "technical_constraints", label: "Technical constraints", type: "textarea", rows: 2, optional: true },
      { key: "dependencies", label: "Dependencies", type: "textarea", rows: 2, optional: true },
      { key: "risks", label: "Risks", type: "textarea", rows: 2, optional: true },
    ],
  },
  {
    id: "portfolio-review",
    name: "Portfolio Reviewer",
    description: "Review portfolio and case-study content and provide actionable feedback.",
    accent: "from-violet-600 to-indigo-900",
    defaultAction: "storytelling-review",
    actions: [
      { id: "storytelling-review", label: "Storytelling review", description: "Narrative clarity", credits: 5 },
      { id: "completeness-review", label: "Content completeness review", description: "Missing sections", credits: 5 },
      { id: "seniority-review", label: "Seniority and leadership review", description: "Signal of seniority", credits: 5 },
      { id: "impact-review", label: "Impact statement review", description: "Evidence of outcomes", credits: 5 },
      { id: "recruiter-review", label: "Recruiter-readiness review", description: "Scan-friendly feedback", credits: 5 },
      { id: "recommended-improvements", label: "Recommended improvements", description: "Prioritised next steps", credits: 5 },
    ],
    fields: [
      { key: "content", label: "Paste portfolio or case-study content", type: "textarea", rows: 10 },
      {
        key: "career_level",
        label: "Career level",
        type: "select",
        options: [
          { value: "junior", label: "Junior" },
          { value: "mid", label: "Mid-level" },
          { value: "senior", label: "Senior" },
          { value: "lead", label: "Lead / Principal" },
        ],
      },
      { key: "target_role", label: "Target role", type: "text", optional: true, placeholder: "Senior UX Researcher" },
      {
        key: "feedback_depth",
        label: "Preferred feedback depth",
        type: "select",
        options: [
          { value: "concise", label: "Concise" },
          { value: "detailed", label: "Detailed" },
          { value: "exhaustive", label: "Exhaustive" },
        ],
      },
    ],
  },
];

export function getAssistant(id: string | undefined): AiAssistantDef | undefined {
  return AI_ASSISTANTS.find((a) => a.id === id);
}

export function contentToMarkdown(content: Record<string, unknown> | string | null | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content.markdown === "string") return content.markdown;
  return JSON.stringify(content, null, 2);
}
