import type { AdminPromptBindingItem } from './admin-prompt-binding-item';

/** Admin prompt binding list response schema exposed by Claw Router. */
export interface AdminPromptBindingListResponse {
  /** Items field on admin prompt binding list response. */
  items: AdminPromptBindingItem[];
}
