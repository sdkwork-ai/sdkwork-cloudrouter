/** Admin pricing rule schema exposed by Cloud Router. */
export interface AdminPricingRule {
  /** Catalog key field on admin pricing rule. */
  catalogKey?: string;
  /** Created at field on admin pricing rule. */
  createdAt?: string;
  /** Effective from field on admin pricing rule. */
  effectiveFrom?: string;
  /** Effective to field on admin pricing rule. */
  effectiveTo?: string;
  /** Formula mode field on admin pricing rule. */
  formulaMode: 'multiplier_markup' | 'unit_price_override';
  /** Id field on admin pricing rule. */
  id: string;
  /** Markup amount field on admin pricing rule. */
  markupAmount?: string;
  /** Meter code field on admin pricing rule. */
  meterCode?: string;
  /** Multiplier field on admin pricing rule. */
  multiplier?: string;
  /** Operation code field on admin pricing rule. */
  operationCode?: string;
  /** Plan code field on admin pricing rule. */
  planCode?: string;
  /** Pricing plan id field on admin pricing rule. */
  pricingPlanId: string;
  /** Priority field on admin pricing rule. */
  priority?: number;
  /** Product code field on admin pricing rule. */
  productCode?: string;
  /** Provider code field on admin pricing rule. */
  providerCode?: string;
  /** Region code field on admin pricing rule. */
  regionCode?: string;
  /** Rule code field on admin pricing rule. */
  ruleCode: string;
  /** Status field on admin pricing rule. */
  status: 'active' | 'inactive';
  /** Unit price override field on admin pricing rule. */
  unitPriceOverride?: string;
  /** Updated at field on admin pricing rule. */
  updatedAt?: string;
}
