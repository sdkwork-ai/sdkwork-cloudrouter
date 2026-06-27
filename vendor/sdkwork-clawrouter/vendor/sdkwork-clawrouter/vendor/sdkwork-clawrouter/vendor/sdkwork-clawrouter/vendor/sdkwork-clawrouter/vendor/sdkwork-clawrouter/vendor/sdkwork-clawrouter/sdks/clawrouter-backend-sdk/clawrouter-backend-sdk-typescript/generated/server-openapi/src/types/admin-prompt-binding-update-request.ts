import type { JsonValue } from './json-value';

/** Admin prompt binding update request schema exposed by Claw Router. */
export interface AdminPromptBindingUpdateRequest {
  /** Binding role field on admin prompt binding update request. */
  bindingRole?: string;
  /** Enabled field on admin prompt binding update request. */
  enabled?: boolean;
  /** Owner id field on admin prompt binding update request. */
  ownerId?: string;
  /** Owner type field on admin prompt binding update request. */
  ownerType?: string;
  /** Policy json field on admin prompt binding update request. */
  policyJson?: Record<string, JsonValue>;
  /** Priority field on admin prompt binding update request. */
  priority?: number;
  /** Prompt version id field on admin prompt binding update request. */
  promptVersionId?: string | null;
}
