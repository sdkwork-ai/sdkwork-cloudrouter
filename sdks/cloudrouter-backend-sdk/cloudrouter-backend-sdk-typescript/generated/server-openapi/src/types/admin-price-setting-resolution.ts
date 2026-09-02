import type { AdminOfficialRateAnchor } from './admin-official-rate-anchor';
import type { AdminPricingRule } from './admin-pricing-rule';

/** Server-computed effective customer price for one (resource, region, meter) price setting. Rule selection reuses the shared runtime selector, so the admin preview can never disagree with billing. */
export interface AdminPriceSettingResolution {
  official: AdminOfficialRateAnchor;
  /** Region the official reference resolved in after the fallback chain (requested -> configured default -> global -> any). */
  regionCode: string;
  /** True when the resolved region is not the requested region. */
  regionFallback: boolean;
  /** Sales plan the preview resolved against. */
  pricingPlanId: string;
  /** Code of the resolved sales plan. */
  pricingPlanCode: string;
  /** Winning sales rule under the shared runtime selector; null when no rule matches and the official reference applies. */
  rule?: AdminPricingRule;
  /** Final single-unit customer price. */
  resolvedUnitPrice: string;
  /** Currency of the resolved unit price. */
  currencyCode: string;
  /** Where the resolved price came from. */
  source: 'rule_override' | 'rule_multiplier_markup' | 'official_reference';
}
