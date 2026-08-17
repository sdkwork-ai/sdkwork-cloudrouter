import type { JsonNull } from './json-null';
import type { OfficialPricingFormula } from './official-pricing-formula';
import type { OfficialPricingRateCondition } from './official-pricing-rate-condition';
import type { OfficialPricingRateTier } from './official-pricing-rate-tier';

/** Official pricing rate schema exposed by Cloud Router. */
export interface OfficialPricingRate {
  /** Api format field on official pricing rate. */
  apiFormat?: string | null;
  /** Billability field on official pricing rate. */
  billability: 'chargeable' | 'free' | 'not_applicable' | 'unknown';
  /** Calculation mode field on official pricing rate. */
  calculationMode: 'per_unit' | 'flat' | 'graduated' | 'volume' | 'formula';
  /** Capabilities field on official pricing rate. */
  capabilities?: string[] | null;
  /** Catalog key field on official pricing rate. */
  catalogKey?: string | null;
  /** Charge timing field on official pricing rate. */
  chargeTiming: 'request_accepted' | 'successful_result' | 'usage_reported';
  /** Conditions field on official pricing rate. */
  conditions: OfficialPricingRateCondition[];
  /** Context tokens field on official pricing rate. */
  contextTokens?: string | null;
  /** Currency code field on official pricing rate. */
  currencyCode: string;
  /** Effective from field on official pricing rate. */
  effectiveFrom: string;
  /** Effective to field on official pricing rate. */
  effectiveTo?: string | null;
  /** Endpoint code field on official pricing rate. */
  endpointCode?: string | null;
  /** Formula field on official pricing rate. */
  formula?: OfficialPricingFormula | JsonNull;
  /** Group codes field on official pricing rate. */
  groupCodes: ('all' | 'llm' | 'image' | 'video' | 'audio' | 'music' | 'embedding' | 'sound' | 'api' | 'other')[];
  /** Input modalities field on official pricing rate. */
  inputModalities?: string[] | null;
  /** Max input tokens field on official pricing rate. */
  maxInputTokens?: string | null;
  /** Max output tokens field on official pricing rate. */
  maxOutputTokens?: string | null;
  /** Meter code field on official pricing rate. */
  meterCode: string;
  /** Meter display name field on official pricing rate. */
  meterDisplayName: string;
  /** Minimum quantity field on official pricing rate. */
  minimumQuantity: string;
  /** Operation code field on official pricing rate. */
  operationCode: string;
  /** Operation display name field on official pricing rate. */
  operationDisplayName: string;
  /** Operation kind field on official pricing rate. */
  operationKind: string;
  /** Output modalities field on official pricing rate. */
  outputModalities?: string[] | null;
  /** Price book code field on official pricing rate. */
  priceBookCode: string;
  /** Price book version field on official pricing rate. */
  priceBookVersion: string;
  /** Priority field on official pricing rate. */
  priority?: number;
  /** Product code field on official pricing rate. */
  productCode: string;
  /** Product display name field on official pricing rate. */
  productDisplayName: string;
  /** Product kind field on official pricing rate. */
  productKind: string;
  /** Provider code field on official pricing rate. */
  providerCode: string;
  /** Quantity aggregation field on official pricing rate. */
  quantityAggregation: 'sum' | 'maximum' | 'minimum' | 'last' | 'distinct_invocation';
  /** Quantity kind field on official pricing rate. */
  quantityKind: string;
  /** Quantity step field on official pricing rate. */
  quantityStep?: string | null;
  /** Rate code field on official pricing rate. */
  rateCode: string;
  /** Rate hash field on official pricing rate. */
  rateHash: string;
  /** Rate variant field on official pricing rate. */
  rateVariant?: 'standard' | 'time_window';
  /** Region code field on official pricing rate. */
  regionCode: string;
  /** Resource code field on official pricing rate. */
  resourceCode: string;
  /** Resource type field on official pricing rate. */
  resourceType: string;
  /** Schedule field on official pricing rate. */
  schedule?: { excludeDates: string[]; includeDates: string[]; timeZone: string; weeklyWindows: ({ daysOfWeek: number[]; endDayOffset: 0 | 1; endTime: string; startTime: string; windowCode: string; })[]; } | null;
  /** Source observed at field on official pricing rate. */
  sourceObservedAt: string;
  /** Source url field on official pricing rate. */
  sourceUrl: string;
  /** Supports json schema field on official pricing rate. */
  supportsJsonSchema?: boolean | null;
  /** Supports streaming field on official pricing rate. */
  supportsStreaming?: boolean | null;
  /** Supports tools field on official pricing rate. */
  supportsTools?: boolean | null;
  /** Tiers field on official pricing rate. */
  tiers: OfficialPricingRateTier[];
  /** Unit code field on official pricing rate. */
  unitCode: string;
  /** Unit price field on official pricing rate. */
  unitPrice: string;
  /** Unit size field on official pricing rate. */
  unitSize: string;
  /** Usage scopes field on official pricing rate. */
  usageScopes?: string[] | null;
  /** Vendor code field on official pricing rate. */
  vendorCode: string;
}
