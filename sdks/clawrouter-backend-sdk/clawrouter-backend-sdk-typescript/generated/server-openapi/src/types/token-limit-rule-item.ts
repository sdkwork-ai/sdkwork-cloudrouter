/** TokenLimitRuleItem contract. */
export interface TokenLimitRuleItem {
  /** burst field on TokenLimitRuleItem. */
  burst: number;
  /** id field on TokenLimitRuleItem. */
  id: string;
  /** keyPrefix field on TokenLimitRuleItem. */
  keyPrefix: string;
  /** rpd field on TokenLimitRuleItem. */
  rpd: number;
  /** rps field on TokenLimitRuleItem. */
  rps: number;
  /** status field on TokenLimitRuleItem. */
  status: 'active' | 'exhausted';
  /** user field on TokenLimitRuleItem. */
  user: string;
}
