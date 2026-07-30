import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** IpLimitRulePage contract. */
export interface IpLimitRulePage {
  /** items field on IpLimitRulePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on ip limit rule page. */
  pageInfo: PageInfo;
}
