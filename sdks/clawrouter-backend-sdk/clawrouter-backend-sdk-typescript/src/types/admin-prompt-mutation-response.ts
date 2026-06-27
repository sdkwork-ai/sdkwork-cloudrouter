import type { AdminPromptItem } from './admin-prompt-item';

/** Admin prompt mutation response schema exposed by Claw Router. */
export interface AdminPromptMutationResponse {
  /** Item field on admin prompt mutation response. */
  item: AdminPromptItem;
}
