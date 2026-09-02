/** Official catalog rate row a price setting anchors on, loaded under the official catalog scope (0, 0) with an active official_reference book. */
export interface AdminOfficialRateAnchor {
  /** Catalog key of the anchored official rate (empty when the resource has no model catalog identity). */
  catalogKey: string;
  /** ISO 4217 currency of the official unit price. */
  currencyCode: string;
  /** Official rate window start (ISO 8601). */
  effectiveFrom?: string;
  /** Official rate window end (ISO 8601); null when open-ended. */
  effectiveTo?: string;
  /** Meter code of the anchored official rate. */
  meterCode: string;
  /** Display name of the meter. */
  meterDisplayName: string;
  /** Operation code of the anchored official rate. */
  operationCode: string;
  /** Product code of the anchored official rate. */
  productCode: string;
  /** Provider code of the anchored official rate. */
  providerCode: string;
  /** Official rate code that anchors the price setting. */
  rateCode: string;
  /** Region code the official rate is published in. */
  regionCode: string;
  /** Resource code of the anchored official rate. */
  resourceCode: string;
  /** Resource type of the anchored official rate. */
  resourceType: string;
  /** Billing unit code. */
  unitCode: string;
  /** Official single-unit reference price in the catalog currency. */
  unitPrice: string;
  /** Units consumed per billing step. */
  unitSize: string;
  /** Vendor code of the anchored official rate. */
  vendorCode: string;
}
