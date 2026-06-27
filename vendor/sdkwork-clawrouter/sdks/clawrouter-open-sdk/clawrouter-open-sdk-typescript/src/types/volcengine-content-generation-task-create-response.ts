import type { ProviderJsonValue } from './provider-json-value';

/** Volcengine Ark volcengine content generation task create response schema exposed by Claw Router vendor routing. */
export interface VolcengineContentGenerationTaskCreateResponse {
  /** Task creation timestamp. */
  created_at?: string;
  /** Created task identifier. */
  id?: string;
  /** Task status. */
  status?: string;
  /** Created task identifier. */
  task_id?: string;
}
