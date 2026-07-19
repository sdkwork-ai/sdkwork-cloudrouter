/** ModelLimitRuleItem contract. */
export interface ModelLimitRuleItem {
  /** channelGroup field on ModelLimitRuleItem. */
  channelGroup: string;
  /** channelGroupId field on ModelLimitRuleItem. */
  channelGroupId: string | unknown;
  /** channelGroupName field on ModelLimitRuleItem. */
  channelGroupName: string | unknown;
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
