/** Admin rate card schema exposed by Cloud Router. */
export interface AdminRateCard {
  /** Created at field on admin rate card. */
  createdAt?: string;
  /** Effective from field on admin rate card. */
  effectiveFrom?: string;
  /** Effective to field on admin rate card. */
  effectiveTo?: string;
  /** Id field on admin rate card. */
  id: string;
  /** Plan code field on admin rate card. */
  planCode?: string;
  /** Plan name field on admin rate card. */
  planName?: string;
  /** Pricing plan id field on admin rate card. */
  pricingPlanId: string;
  /** Priority field on admin rate card. */
  priority?: number;
  /** Status field on admin rate card. */
  status: 'active' | 'inactive';
  /** Subject code field on admin rate card. */
  subjectCode?: string;
  /** Subject id field on admin rate card. */
  subjectId?: string;
  /** Subject type field on admin rate card. */
  subjectType: 'default' | 'api_key' | 'account_group' | 'account' | 'user' | 'organization';
  /** Updated at field on admin rate card. */
  updatedAt?: string;
}
