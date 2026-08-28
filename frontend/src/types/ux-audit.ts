export type UxAuditCategory =
  | "conversion_experience"
  | "conversion_journey"
  | "usability_navigation"
  | "accessibility"
  | "mobile_experience"
  | "performance"
  | "content_trust";

export type UxAuditSeverity = "critical" | "high" | "medium" | "low";
export type UxAuditConfidence = "confirmed" | "likely" | "requires_expert_review";
export type UxAuditEffort = "low" | "medium" | "high";
export type UxAuditCheckStatus =
  | "passed"
  | "warning"
  | "failed"
  | "not_applicable"
  | "not_tested"
  | "manual_review";

export interface UxAuditCategoryScore {
  category: UxAuditCategory;
  score: number | null;
  weight: number;
  coverage?: number;
  checks_completed?: number;
  checks_passed?: number;
  checks_warning?: number;
  checks_failed?: number;
  checks_manual?: number;
  checks_unavailable?: number;
  summary: string;
}

export interface UxAuditFinding {
  check_id?: string;
  title: string;
  explanation: string;
  evidence: string;
  evidence_items?: string[];
  category: UxAuditCategory;
  status?: UxAuditCheckStatus;
  severity: UxAuditSeverity;
  confidence: UxAuditConfidence;
  affected_element: string;
  affected_elements?: string[];
  recommendation: string;
  expected_ux_outcome: string;
  potential_business_effect: string;
  estimated_effort: UxAuditEffort;
  business_impact?: "high" | "medium" | "low";
  measurement_source?: string;
  requires_expert_review?: boolean;
  priority_score: number;
}

export interface UxAuditRoadmap {
  fix_now: UxAuditFinding[];
  improve_next: UxAuditFinding[];
  investigate_further: UxAuditFinding[];
}

export interface UxAuditCheckSummary {
  total: number;
  passed: number;
  warning: number;
  failed: number;
  not_applicable: number;
  not_tested: number;
  manual_review: number;
}

export interface UxAuditSummary {
  critical_issues: number;
  improvement_opportunities: number;
  quick_wins: number;
  response_time_ms?: number;
  http_status?: number;
  performance_metrics?: {
    performance_score?: number | null;
    lcp_ms?: number | null;
    cls?: number | null;
    inp_ms?: number | null;
    fcp_ms?: number | null;
    ttfb_ms?: number | null;
    strategy?: string;
    source?: string;
  } | null;
}

export interface UxAuditCapabilities {
  pagespeed?: {
    configured: boolean;
    reason?: string;
    error?: string;
    performance_score?: number | null;
  };
  playwright?: {
    available: boolean;
    reason?: string | null;
  };
  data_sources?: string[];
}

export interface UxAuditPlaceholderMetrics {
  available: boolean;
  message: string;
  metrics: string[];
}

export interface UxAuditPageScanned {
  url: string;
  label: string;
}

export interface UxAuditPublic {
  id: number;
  access_token: string;
  website_url: string;
  normalized_url?: string;
  page_type?: string | null;
  primary_goal?: string | null;
  status: "completed" | "failed" | string;
  overall_score?: number | null;
  score_interpretation?: string | null;
  audit_coverage?: number | null;
  score_incomplete?: boolean;
  growth_opportunity?: string;
  growth_message?: string | null;
  category_scores?: UxAuditCategoryScore[];
  check_summary?: UxAuditCheckSummary | null;
  findings?: UxAuditFinding[];
  roadmap?: UxAuditRoadmap;
  summary?: UxAuditSummary;
  limitations?: string[];
  capabilities?: UxAuditCapabilities | null;
  pages_scanned?: UxAuditPageScanned[];
  analytics_metrics?: UxAuditPlaceholderMetrics | null;
  user_research_metrics?: UxAuditPlaceholderMetrics | null;
  scan_version?: string;
  scoring_model_version?: string;
  submitted_at: string;
  completed_at?: string;
  failure_reason?: string | null;
  has_lead?: boolean;
  rerun_count?: number;
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
