import { apiFetch } from "./client";

export type Opportunity = {
  id: string;
  title: string;
  normalized_title: string;
  category: OpportunityCategory;
  description: string;
  source_name: string;
  source_url: string;
  source_urls: string[];
  provider: string | null;
  location: string;
  content_language: string;
  business_category: string;
  product_category: string;
  opportunity_type: string;
  target_audience: string | null;
  eligibility_requirements: string | null;
  benefits: string | null;
  fees: string | null;
  start_date: string | null;
  application_url: string | null;
  application_procedure: string | null;
  duration: string | null;
  delivery_mode: string | null;
  certification: string | null;
  event_date: string | null;
  venue: string | null;
  accepted_products: string | null;
  buyer_details: string | null;
  experience_min: number | null;
  age_min: number | null;
  age_max: number | null;
  gender_eligibility: string;
  eligibility_text: string;
  deadline: string | null;
  last_checked_at: string;
  last_crawled_at: string;
  last_verified_at: string | null;
  status: "active" | "expired" | "unverified";
  review_status: "pending" | "approved" | "rejected";
  match_reasons: string[];
  match_score: number;
  eligibility_status: "criteria_match_unconfirmed" | "not_verified" | "criteria_mismatch";
  recommendation_group: "highly_relevant" | "potentially_relevant" | "eligibility_not_verified";
};

export type OpportunityCategory = "GOVERNMENT_SCHEME" | "COURSE_OR_TRAINING" | "MARKET_LINKAGE";

export type OpportunityRecommendations = {
  categories: Record<OpportunityCategory, Opportunity[]>;
  highly_relevant: Opportunity[];
  potentially_relevant: Opportunity[];
  eligibility_not_verified: Opportunity[];
};

export type CrawlRun = {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "partial" | "failed";
  sites_checked: number;
  records_found: number;
  records_added: number;
  errors: Array<{ source?: string; message: string }>;
};

export const opportunityApi = {
  getRecommendations: () => apiFetch<OpportunityRecommendations>("/opportunities/recommended"),
};
