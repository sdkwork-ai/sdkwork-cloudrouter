/** Rate card create request schema exposed by Cloud Router. */
export interface RateCardCreateRequest {
  /** Effective from field on rate card create request. */
  effectiveFrom?: string;
  /** Effective to field on rate card create request. */
  effectiveTo?: string;
  /** Pricing plan id field on rate card create request. */
  pricingPlanId: string;
  /** Priority field on rate card create request. */
  priority?: number;
  /** Status field on rate card create request. */
  status: 'active' | 'inactive';
  /** Subject code field on rate card create request. */
  subjectCode?: string;
  /** Subject id field on rate card create request. */
  subjectId?: string;
  /** Subject type field on rate card create request. */
  subjectType: 'default' | 'api_key' | 'account_group' | 'account' | 'user' | 'organization';
}
