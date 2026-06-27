import type { AdminPromptListResponse } from './admin-prompt-list-response';

/** Definitions list result schema exposed by Claw Router. */
export interface DefinitionsListResult {
  /** Business response code. */
  code: string;
  /** Data field on definitions list result. */
  data?: AdminPromptListResponse;
  /** Human-readable response message. */
  msg?: string;
}
