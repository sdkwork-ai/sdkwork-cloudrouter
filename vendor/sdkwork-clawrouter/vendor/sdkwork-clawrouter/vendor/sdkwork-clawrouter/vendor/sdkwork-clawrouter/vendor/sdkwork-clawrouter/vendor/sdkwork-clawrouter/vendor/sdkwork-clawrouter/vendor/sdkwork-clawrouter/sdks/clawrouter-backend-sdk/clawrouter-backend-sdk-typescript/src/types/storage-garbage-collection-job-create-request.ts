import type { JsonValue } from './json-value';

/** Storage garbage collection job create request schema exposed by Claw Router. */
export interface StorageGarbageCollectionJobCreateRequest {
  [key: string]: JsonValue;
}