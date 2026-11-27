/** One per-resource price an account group defines. Exactly one pricing mode applies; the database enforces the same payload exclusivity. */
export interface UpstreamAccountGroupResourcePriceInput {
  /** Existing row to update in place; omitted for a new row. */
  id?: string;
  /** Resource class the price applies to. */
  resourceType: 'model' | 'image' | 'video' | 'api' | 'audio' | 'other';
  catalogKey: string;
  operationCode: string;
  meterCode: string;
  regionCode: string;
  /** Blank prices every provider of the resource. */
  providerCode?: string;
  priceMode: 'multiplier' | 'markup' | 'unit_price' | 'free';
  /** Required when priceMode is multiplier. */
  multiplier?: string;
  /** Required when priceMode is markup. */
  markupAmount?: string;
  /** Required when priceMode is unit_price. */
  unitPriceOverride?: string;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}
