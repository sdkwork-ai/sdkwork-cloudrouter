/** Exchange rule mutation request schema exposed by Cloud Router. */
export interface ExchangeRuleMutationRequest {
  /** Rate field on exchange rule mutation request. */
  rate: string;
  /** Source asset type field on exchange rule mutation request. */
  sourceAssetType: 'POINTS' | 'CASH';
  /** Status field on exchange rule mutation request. */
  status?: 'active';
  /** Target asset type field on exchange rule mutation request. */
  targetAssetType: 'POINTS' | 'CASH';
}
