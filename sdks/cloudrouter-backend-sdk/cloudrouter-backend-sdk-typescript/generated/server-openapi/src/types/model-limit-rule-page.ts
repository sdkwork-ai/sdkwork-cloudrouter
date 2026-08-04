import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** ModelLimitRulePage contract. */
export interface ModelLimitRulePage {
  /** items field on ModelLimitRulePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on model limit rule page. */
  pageInfo: PageInfo;
}
