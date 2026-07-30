import type { JsonValue } from './json-value';
import type { PageInfo } from './page-info';

/** AdminRecordPage contract. */
export interface AdminRecordPage {
  /** items field on AdminRecordPage. */
  items: Record<string, JsonValue>[];
  /** Page info field on admin record page. */
  pageInfo: PageInfo;
}
