/** Pricing rule create request schema exposed by Cloud Router. */
export interface PricingRuleCreateRequest {
  /** Catalog key field on pricing rule create request. */
  catalogKey?: string;
  /** Effective from field on pricing rule create request. */
  effectiveFrom?: string;
  /** Effective to field on pricing rule create request. */
  effectiveTo?: string;
  /** Formula mode field on pricing rule create request. */
  formulaMode: 'multiplier_markup' | 'unit_price_override';
  /** Markup amount field on pricing rule create request. */
  markupAmount?: string;
  /** Meter code field on pricing rule create request. */
  meterCode?: string;
  /** Multiplier field on pricing rule create request. */
  multiplier?: string;
  /** Operation code field on pricing rule create request. */
  operationCode?: string;
  /** Pricing plan id field on pricing rule create request. */
  pricingPlanId: string;
  /** Priority field on pricing rule create request. */
  priority?: number;
  /** Product code field on pricing rule create request. */
  productCode?: string;
  /** Provider code field on pricing rule create request. */
  providerCode?: string;
  /** Region code field on pricing rule create request. */
  regionCode?: string;
  /** Rule code field on pricing rule create request. */
  ruleCode: string;
  /** Status field on pricing rule create request. */
  status: 'active' | 'inactive';
  /** Unit price override field on pricing rule create request. */
  unitPriceOverride?: string;
}
