/** Pricing rule update request schema exposed by Cloud Router. */
export interface PricingRuleUpdateRequest {
  /** Catalog key field on pricing rule update request. */
  catalogKey?: string;
  /** Effective from field on pricing rule update request. */
  effectiveFrom?: string;
  /** Effective to field on pricing rule update request. */
  effectiveTo?: string;
  /** Formula mode field on pricing rule update request. */
  formulaMode: 'multiplier_markup' | 'unit_price_override';
  /** Markup amount field on pricing rule update request. */
  markupAmount?: string;
  /** Meter code field on pricing rule update request. */
  meterCode?: string;
  /** Multiplier field on pricing rule update request. */
  multiplier?: string;
  /** Operation code field on pricing rule update request. */
  operationCode?: string;
  /** Pricing plan id field on pricing rule update request. */
  pricingPlanId: string;
  /** Priority field on pricing rule update request. */
  priority?: number;
  /** Product code field on pricing rule update request. */
  productCode?: string;
  /** Provider code field on pricing rule update request. */
  providerCode?: string;
  /** Region code field on pricing rule update request. */
  regionCode?: string;
  /** Rule code field on pricing rule update request. */
  ruleCode?: string;
  /** Status field on pricing rule update request. */
  status: 'active' | 'inactive';
  /** Unit price override field on pricing rule update request. */
  unitPriceOverride?: string;
}
