import type { AdminPromptMutationResponse } from './admin-prompt-mutation-response';

/** Definitions create result schema exposed by Claw Router. */
export interface DefinitionsCreateResult {
  /** Business response code. */
  code: string;
  /** Data field on definitions create result. */
  data?: AdminPromptMutationResponse;
  /** Human-readable response message. */
  msg?: string;
}
