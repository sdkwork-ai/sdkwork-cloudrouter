/** Rate card update request schema exposed by Cloud Router. */
export interface RateCardUpdateRequest {
  /** Effective from field on rate card update request. */
  effectiveFrom?: string;
  /** Effective to field on rate card update request. */
  effectiveTo?: string;
  /** Pricing plan id field on rate card update request. */
  pricingPlanId: string;
  /** Priority field on rate card update request. */
  priority?: number;
  /** Status field on rate card update request. */
  status: 'active' | 'inactive';
  /** Subject code field on rate card update request. */
  subjectCode?: string;
  /** Subject id field on rate card update request. */
  subjectId?: string;
  /** Subject type field on rate card update request. */
  subjectType: 'default' | 'api_key' | 'account_group' | 'account' | 'user' | 'organization';
}
