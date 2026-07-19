import type { PageInfo } from './page-info';

/** AdminChannelPage contract. */
export interface AdminChannelPage {
  /** items field on AdminChannelPage. */
  items: Record<string, unknown>[];
  /** pageInfo field on AdminChannelPage. */
  pageInfo: PageInfo;
}
