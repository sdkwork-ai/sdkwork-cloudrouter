import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** TokenLimitRulePage contract. */
export interface TokenLimitRulePage {
  /** items field on TokenLimitRulePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on token limit rule page. */
  pageInfo: PageInfo;
}
