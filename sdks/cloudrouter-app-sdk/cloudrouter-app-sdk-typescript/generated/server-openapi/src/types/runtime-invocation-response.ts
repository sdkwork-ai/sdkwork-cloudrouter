import type { RuntimeInvocationItem } from './runtime-invocation-item';

/** Runtime invocation response schema exposed by Cloud Router. */
export interface RuntimeInvocationResponse {
  /** Item field on runtime invocation response. */
  item: RuntimeInvocationItem;
}
