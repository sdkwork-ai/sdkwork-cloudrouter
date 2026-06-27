import type { JsonValue } from './json-value';

/** Admin prompt render request schema exposed by Claw Router. */
export interface AdminPromptRenderRequest {
  /** Variables field on admin prompt render request. */
  variables?: Record<string, JsonValue>;
}
