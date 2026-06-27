import type { AdminPromptItem } from './admin-prompt-item';

/** Admin prompt list response schema exposed by Claw Router. */
export interface AdminPromptListResponse {
  /** Items field on admin prompt list response. */
  items: AdminPromptItem[];
}
