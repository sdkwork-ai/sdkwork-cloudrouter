/** IpLimitRuleItem contract. */
export interface IpLimitRuleItem {
  /** blockDuration field on IpLimitRuleItem. */
  blockDuration: string;
  /** id field on IpLimitRuleItem. */
  id: string;
  /** rpm field on IpLimitRuleItem. */
  rpm: number;
  /** rps field on IpLimitRuleItem. */
  rps: number;
  /** ruleName field on IpLimitRuleItem. */
  ruleName: string;
  /** status field on IpLimitRuleItem. */
  status: 'active' | 'inactive';
  /** targetIp field on IpLimitRuleItem. */
  targetIp: string;
}
