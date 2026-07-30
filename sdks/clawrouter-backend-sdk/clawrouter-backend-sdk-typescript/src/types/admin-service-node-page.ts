import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** AdminServiceNodePage contract. */
export interface AdminServiceNodePage {
  /** items field on AdminServiceNodePage. */
  items: Record<string, JsonValue>[];
  /** Page info field on admin service node page. */
  pageInfo: PageInfo;
}
