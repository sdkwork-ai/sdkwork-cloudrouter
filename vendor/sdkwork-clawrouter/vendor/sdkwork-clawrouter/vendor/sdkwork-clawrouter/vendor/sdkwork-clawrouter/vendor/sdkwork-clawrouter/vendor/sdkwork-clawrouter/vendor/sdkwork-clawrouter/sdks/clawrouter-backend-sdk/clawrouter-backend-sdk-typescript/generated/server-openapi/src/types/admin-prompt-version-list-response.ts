import type { AdminPromptVersionItem } from './admin-prompt-version-item';

/** Admin prompt version list response schema exposed by Claw Router. */
export interface AdminPromptVersionListResponse {
  /** Items field on admin prompt version list response. */
  items: AdminPromptVersionItem[];
}
