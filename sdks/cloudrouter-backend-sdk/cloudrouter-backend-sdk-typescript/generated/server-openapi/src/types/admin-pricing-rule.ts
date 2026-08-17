/** Admin pricing rule schema exposed by Cloud Router. */
export interface AdminPricingRule {
  /** Catalog key field on admin pricing rule. */
  catalogKey?: string;
  /** Conditions field on admin pricing rule. */
  conditions?: ({ dimensionCode: string; operatorCode: 'exists' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in'; value: string | number | boolean | (string | number | boolean)[]; })[];
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
  /** Schedule field on admin pricing rule. */
  schedule?: { excludeDates: string[]; includeDates: string[]; timeZone: string; weeklyWindows: ({ daysOfWeek: number[]; endDayOffset: 0 | 1; endTime: string; startTime: string; windowCode: string; })[]; } | null;
  /** Status field on admin pricing rule. */
  status: 'active' | 'inactive';
  /** Unit price override field on admin pricing rule. */
  unitPriceOverride?: string;
  /** Updated at field on admin pricing rule. */
  updatedAt?: string;
}
