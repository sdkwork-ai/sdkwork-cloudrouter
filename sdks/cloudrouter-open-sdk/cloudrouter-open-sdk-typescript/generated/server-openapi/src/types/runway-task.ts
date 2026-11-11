import type { ProviderJsonValue } from './provider-json-value';

/** Runway generation task and its outputs. */
export interface RunwayTask {
  /** Task creation timestamp. */
  createdAt?: string;
  /** Failure reason when the task did not succeed. */
  failure?: string;
  /** Provider failure code when the task did not succeed. */
  failureCode?: string;
  /** Runway task identifier. */
  id?: string;
  /** Generated asset URLs. */
  output?: string[];
  /** Completion ratio between 0 and 1. */
  progress?: number;
  /** Task status: PENDING, RUNNING, SUCCEEDED, FAILED, or CANCELLED. */
  status?: string;
}
