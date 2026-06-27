import type { JsonValue } from './json-value';

/** Admin prompt binding item schema exposed by Claw Router. */
export interface AdminPromptBindingItem {
  /** Binding role field on admin prompt binding item. */
  bindingRole: string;
  /** Created at field on admin prompt binding item. */
  createdAt: string;
  /** Enabled field on admin prompt binding item. */
  enabled: boolean;
  /** Id field on admin prompt binding item. */
  id: string;
  /** Organization id field on admin prompt binding item. */
  organizationId: string;
  /** Owner id field on admin prompt binding item. */
  ownerId: string;
  /** Owner type field on admin prompt binding item. */
  ownerType: string;
  /** Policy json field on admin prompt binding item. */
  policyJson: Record<string, JsonValue>;
  /** Priority field on admin prompt binding item. */
  priority: number;
  /** Prompt id field on admin prompt binding item. */
  promptId: string;
  /** Prompt version id field on admin prompt binding item. */
  promptVersionId?: string | null;
  /** Snapshot json field on admin prompt binding item. */
  snapshotJson: Record<string, JsonValue>;
  /** Tenant id field on admin prompt binding item. */
  tenantId: string;
  /** Updated at field on admin prompt binding item. */
  updatedAt: string;
  /** Uuid field on admin prompt binding item. */
  uuid: string;
}
