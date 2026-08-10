/** Admin exchange rule schema exposed by Cloud Router. */
export interface AdminExchangeRule {
  /** Id field on admin exchange rule. */
  id: string;
  /** Rate field on admin exchange rule. */
  rate: string;
  /** Source asset type field on admin exchange rule. */
  sourceAssetType: 'POINTS' | 'CASH';
  /** Status field on admin exchange rule. */
  status: 'active';
  /** Target asset type field on admin exchange rule. */
  targetAssetType: 'POINTS' | 'CASH';
}
