/** Create or update the standard sales rule backing one (resource, region, meter) price setting. Scope dimensions are derived server-side from the anchored official rate. */
export interface PriceSettingUpsertRequest {
  /** Rule window start (ISO 8601); defaults to now for new rules. */
  effectiveFrom?: string;
  /** Rule window end (ISO 8601); null when open-ended. */
  effectiveTo?: string;
  /** Price formula mode. */
  formulaMode: 'multiplier_markup' | 'unit_price_override';
  /** Fixed per-unit markup amount (multiplier_markup mode; defaults to 0). */
  markupAmount?: string;
  /** Multiplier applied to the official unit price (multiplier_markup mode; defaults to 1). */
  multiplier?: string;
  /** Official rate code the edit anchors on; the store derives the six scope dimensions from this row. */
  officialRateCode: string;
  /** Sales plan the price setting belongs to. */
  pricingPlanId: string;
  /** Rule priority (lower wins; defaults to 100). Serialized as a string per the int64 wire contract. */
  priority?: string;
  /** Explicit update target; required for time-window variants. Omit to update (or create) the unconditioned standard rule for the tuple. */
  ruleId?: string;
  /** Time-window schedule (weekly windows plus include/exclude dates); requires ruleId. */
  schedule?: { excludeDates: string[]; includeDates: string[]; timeZone: string; weeklyWindows: ({ daysOfWeek: number[]; endDayOffset: 0 | 1; endTime: string; startTime: string; windowCode: string; })[]; } | null;
  /** Rule status. */
  status?: 'active' | 'inactive';
  /** Absolute unit price (unit_price_override mode). */
  unitPriceOverride?: string;
}
