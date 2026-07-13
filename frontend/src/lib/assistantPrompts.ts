import type { AssistantContextType } from "../types";

export const QUICK_PROMPTS: Record<AssistantContextType, string[]> = {
  general: [
    "Help me plan my UX portfolio structure",
    "What makes a strong UX case study?",
    "How do I showcase research impact?",
    "Which template should I start with?",
  ],
  case_study: [
    "Draft a compelling summary from my notes",
    "Write the challenge section for this project",
    "Suggest research methods for this study",
    "Improve my impact section with measurable outcomes",
  ],
  project: [
    "Write a project description for my portfolio",
    "Suggest tags and outcomes for this project",
    "Turn my bullet notes into a polished summary",
  ],
  profile: [
    "Write a professional bio for a UX researcher",
    "Improve my headline and bio",
    "Make my profile sound more senior and specific",
  ],
  portfolio: [
    "Which case studies should I feature first?",
    "How should I order my portfolio sections?",
    "Give me tips to make my public portfolio stand out",
    "Which portfolio theme fits a job search?",
  ],
};

export function contextLabel(type: AssistantContextType): string {
  switch (type) {
    case "case_study":
      return "Case study";
    case "project":
      return "Project";
    case "profile":
      return "Profile";
    case "portfolio":
      return "Portfolio";
    default:
      return "Portfolio assistant";
  }
}
