import type { RuntimeEventItem } from './runtime-event-item';

/** Runtime event response schema exposed by Cloud Router. */
export interface RuntimeEventResponse {
  /** Item field on runtime event response. */
  item: RuntimeEventItem;
}
