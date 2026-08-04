import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** FirewallRulePage contract. */
export interface FirewallRulePage {
  /** items field on FirewallRulePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on firewall rule page. */
  pageInfo: PageInfo;
}
