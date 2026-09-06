/** Price setting upsert request schema exposed by Cloud Router. */
export interface PriceSettingUpsertRequest {
  /** Effective from field on price setting upsert request. */
  effectiveFrom?: string;
  /** Effective to field on price setting upsert request. */
  effectiveTo?: string;
  /** Formula mode field on price setting upsert request. */
  formulaMode: 'multiplier_markup' | 'unit_price_override';
  /** Markup amount field on price setting upsert request. */
  markupAmount?: string;
  /** Multiplier field on price setting upsert request. */
  multiplier?: string;
  /** Official rate code field on price setting upsert request. */
  officialRateCode: string;
  /** Pricing plan id field on price setting upsert request. */
  pricingPlanId: string;
  /** Priority field on price setting upsert request. */
  priority?: string;
  /** Rule id field on price setting upsert request. */
  ruleId?: string;
  /** Schedule field on price setting upsert request. */
  schedule?: { excludeDates: string[]; includeDates: string[]; timeZone: string; weeklyWindows: ({ daysOfWeek: number[]; endDayOffset: 0 | 1; endTime: string; startTime: string; windowCode: string; })[]; } | null;
  /** Status field on price setting upsert request. */
  status?: 'active' | 'inactive';
  /** Unit price override field on price setting upsert request. */
  unitPriceOverride?: string;
}
