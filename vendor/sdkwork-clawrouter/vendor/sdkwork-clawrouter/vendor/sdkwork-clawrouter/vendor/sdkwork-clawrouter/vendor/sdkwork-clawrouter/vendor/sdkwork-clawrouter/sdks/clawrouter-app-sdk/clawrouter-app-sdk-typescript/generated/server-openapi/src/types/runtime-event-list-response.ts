import type { RuntimeEventItem } from './runtime-event-item';

/** Runtime event list response schema exposed by Claw Router. */
export interface RuntimeEventListResponse {
  /** Items field on runtime event list response. */
  items: RuntimeEventItem[];
}
