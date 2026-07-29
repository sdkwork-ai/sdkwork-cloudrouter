/** ModelLimitRuleItem contract. */
export interface ModelLimitRuleItem {
  /** Upstream account group code. */
  accountGroup: string;
  /** Upstream account group identifier. */
  accountGroupId: string | unknown;
  /** Upstream account group display name. */
  accountGroupName: string | unknown;
  /** id field on ModelLimitRuleItem. */
  id: string;
  /** model field on ModelLimitRuleItem. */
  model: string;
  /** rpm field on ModelLimitRuleItem. */
  rpm: number;
  /** status field on ModelLimitRuleItem. */
  status: 'active' | 'inactive';
  /** tpm field on ModelLimitRuleItem. */
  tpm: number;
}
