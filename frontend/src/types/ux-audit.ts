export type UxAuditCategory =
  | "usability_navigation"
  | "conversion_journey"
  | "accessibility"
  | "mobile_experience"
  | "performance"
  | "content_trust";

export type UxAuditSeverity = "critical" | "high" | "medium" | "low";
export type UxAuditConfidence = "confirmed" | "likely" | "requires_expert_review";
export type UxAuditEffort = "low" | "medium" | "high";

export interface UxAuditCategoryScore {
  category: UxAuditCategory;
  score: number;
  weight: number;
  summary: string;
}

export interface UxAuditFinding {
  title: string;
  explanation: string;
  evidence: string;
  category: UxAuditCategory;
  severity: UxAuditSeverity;
  confidence: UxAuditConfidence;
  affected_element: string;
  recommendation: string;
  expected_ux_outcome: string;
  potential_business_effect: string;
  estimated_effort: UxAuditEffort;
  business_impact?: "high" | "medium" | "low";
  priority_score: number;
}

export interface UxAuditRoadmap {
  fix_now: UxAuditFinding[];
  improve_next: UxAuditFinding[];
  investigate_further: UxAuditFinding[];
}

export interface UxAuditSummary {
  critical_issues: number;
  improvement_opportunities: number;
  quick_wins: number;
  response_time_ms?: number;
  http_status?: number;
}

export interface UxAuditPublic {
  id: number;
  access_token: string;
  website_url: string;
  normalized_url?: string;
  page_type?: string | null;
  primary_goal?: string | null;
  status: "completed" | "failed" | string;
  overall_score?: number;
  growth_opportunity?: string;
  category_scores?: UxAuditCategoryScore[];
  findings?: UxAuditFinding[];
  roadmap?: UxAuditRoadmap;
  summary?: UxAuditSummary;
  limitations?: string[];
  submitted_at: string;
  completed_at?: string;
  failure_reason?: string | null;
  has_lead?: boolean;
}

export interface UxAuditAdminRow extends UxAuditPublic {
  company_name?: string | null;
  lead_status?: string;
  lead?: {
    full_name: string;
    business_email: string;
    company_name: string;
    job_role?: string | null;
    phone?: string | null;
    service_consent: boolean;
    marketing_consent: boolean;
    request_type?: string;
    created_at: string;
  } | null;
  internal_notes?: string;
}

export interface UxAuditSubmitPayload {
  website_url: string;
  page_type?: string;
  primary_goal?: string;
  primary_audience?: string;
  company_name?: string;
  industry?: string;
  main_concern?: string;
  monthly_traffic_range?: string;
  current_conversion_rate?: string;
  target_action?: string;
  concerns?: string[];
  uxg_hp?: string;
}

export interface UxAuditLeadPayload {
  full_name: string;
  business_email: string;
  company_name: string;
  job_role?: string;
  phone?: string;
  service_consent: boolean;
  marketing_consent: boolean;
  request_type?: "report" | "consultation" | "review";
  uxg_hp?: string;
}
