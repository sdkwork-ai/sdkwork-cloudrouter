import type { PageInfo } from './page-info';
import type { RuntimeInvocationItem } from './runtime-invocation-item';

/** Runtime invocation list response schema exposed by Claw Router. */
export interface RuntimeInvocationListResponse {
  /** Items field on runtime invocation list response. */
  items: RuntimeInvocationItem[];
  /** Page info field on runtime invocation list response. */
  pageInfo: PageInfo;
}
