import type { JsonValue } from './json-value';

/** Admin storage garbage collection create request schema exposed by Claw Router. */
export interface AdminStorageGarbageCollectionCreateRequest {
  /** Criteria field on admin storage garbage collection create request. */
  criteria?: Record<string, JsonValue> | null;
  /** Dry run field on admin storage garbage collection create request. */
  dryRun?: boolean | null;
  /** Dry run sample field on admin storage garbage collection create request. */
  dryRunSample?: string | null;
  /** Job type field on admin storage garbage collection create request. */
  jobType?: string | null;
  /** Retention window field on admin storage garbage collection create request. */
  retentionWindow?: string | null;
  /** Target field on admin storage garbage collection create request. */
  target?: string | null;
}
