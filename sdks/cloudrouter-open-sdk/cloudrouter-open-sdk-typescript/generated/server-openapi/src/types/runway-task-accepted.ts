import type { ProviderJsonValue } from './provider-json-value';

/** Runway task submission acknowledgement; poll the task through GET /runway/v1/tasks/{task_id}. */
export interface RunwayTaskAccepted {
  /** Provider cost estimate for the submitted task, in credits. */
  estimatedCost?: Record<string, ProviderJsonValue>;
  /** Runway task identifier used for polling. */
  id: string;
}
