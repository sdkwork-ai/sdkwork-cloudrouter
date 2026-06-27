import type { RuntimeInvocationItem } from './runtime-invocation-item';

/** Runtime invocation list response schema exposed by Claw Router. */
export interface RuntimeInvocationListResponse {
  /** Items field on runtime invocation list response. */
  items: RuntimeInvocationItem[];
}
