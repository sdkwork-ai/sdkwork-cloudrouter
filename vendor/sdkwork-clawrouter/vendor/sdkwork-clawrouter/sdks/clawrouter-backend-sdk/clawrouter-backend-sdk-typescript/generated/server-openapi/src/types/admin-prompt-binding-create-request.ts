import type { JsonValue } from './json-value';

/** Admin prompt binding create request schema exposed by Claw Router. */
export interface AdminPromptBindingCreateRequest {
  /** Binding role field on admin prompt binding create request. */
  bindingRole: string;
  /** Enabled field on admin prompt binding create request. */
  enabled?: boolean;
  /** Owner id field on admin prompt binding create request. */
  ownerId: string;
  /** Owner type field on admin prompt binding create request. */
  ownerType: string;
  /** Policy json field on admin prompt binding create request. */
  policyJson?: Record<string, JsonValue>;
  /** Priority field on admin prompt binding create request. */
  priority?: number;
  /** Prompt version id field on admin prompt binding create request. */
  promptVersionId?: string | null;
}
