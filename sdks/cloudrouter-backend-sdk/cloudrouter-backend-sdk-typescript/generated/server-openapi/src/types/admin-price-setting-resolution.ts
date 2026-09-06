import type { AdminOfficialRateAnchor } from './admin-official-rate-anchor';
import type { AdminPricingRule } from './admin-pricing-rule';

/** Admin price setting resolution schema exposed by Cloud Router. */
export interface AdminPriceSettingResolution {
  /** Currency code field on admin price setting resolution. */
  currencyCode: string;
  /** Official field on admin price setting resolution. */
  official: AdminOfficialRateAnchor;
  /** Pricing plan code field on admin price setting resolution. */
  pricingPlanCode: string;
  /** Pricing plan id field on admin price setting resolution. */
  pricingPlanId: string;
  /** Region code field on admin price setting resolution. */
  regionCode: string;
  /** Region fallback field on admin price setting resolution. */
  regionFallback: boolean;
  /** Resolved unit price field on admin price setting resolution. */
  resolvedUnitPrice: string;
  /** Rule field on admin price setting resolution. */
  rule?: AdminPricingRule;
  /** Source field on admin price setting resolution. */
  source: 'rule_override' | 'rule_multiplier_markup' | 'official_reference';
}
