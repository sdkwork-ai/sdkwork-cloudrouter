/** Upstream account group resource price schema exposed by Cloud Router. */
export interface UpstreamAccountGroupResourcePrice {
  /** Account group code snapshot field on upstream account group resource price. */
  accountGroupCodeSnapshot: string;
  /** Account group id field on upstream account group resource price. */
  accountGroupId: string;
  /** Catalog key field on upstream account group resource price. */
  catalogKey: string;
  /** Currency code field on upstream account group resource price. */
  currencyCode: string;
  /** Effective from field on upstream account group resource price. */
  effectiveFrom: string;
  /** Effective to field on upstream account group resource price. */
  effectiveTo: string | null;
  /** Id field on upstream account group resource price. */
  id: string;
  /** Markup amount field on upstream account group resource price. */
  markupAmount: string;
  /** Meter code field on upstream account group resource price. */
  meterCode: string;
  /** Multiplier field on upstream account group resource price. */
  multiplier: string;
  /** Operation code field on upstream account group resource price. */
  operationCode: string;
  /** Price mode field on upstream account group resource price. */
  priceMode: string;
  /** Provider code field on upstream account group resource price. */
  providerCode: string;
  /** Region code field on upstream account group resource price. */
  regionCode: string;
  /** Resource type field on upstream account group resource price. */
  resourceType: string;
  /** Status field on upstream account group resource price. */
  status: number;
  /** Unit price override field on upstream account group resource price. */
  unitPriceOverride: string | null;
  /** Uuid field on upstream account group resource price. */
  uuid: string;
}
