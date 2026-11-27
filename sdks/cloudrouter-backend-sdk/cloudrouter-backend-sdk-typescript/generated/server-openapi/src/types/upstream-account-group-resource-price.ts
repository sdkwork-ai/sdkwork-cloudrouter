/** One account group per-resource price row exposed by Cloud Router. */
export interface UpstreamAccountGroupResourcePrice {
  id: string;
  uuid?: string;
  accountGroupId: string;
  accountGroupCodeSnapshot: string;
  resourceType: string;
  catalogKey: string;
  operationCode: string;
  meterCode: string;
  regionCode: string;
  providerCode: string;
  priceMode: 'multiplier' | 'markup' | 'unit_price' | 'free';
  multiplier: string;
  markupAmount: string;
  unitPriceOverride?: string;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: number;
}
