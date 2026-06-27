import type { JsonValue } from './json-value';

/** Admin prompt version item schema exposed by Claw Router. */
export interface AdminPromptVersionItem {
  /** Checksum hash field on admin prompt version item. */
  checksumHash: string;
  /** Content field on admin prompt version item. */
  content: string;
  /** Created at field on admin prompt version item. */
  createdAt: string;
  /** Created by field on admin prompt version item. */
  createdBy: string;
  /** Examples json field on admin prompt version item. */
  examplesJson: Record<string, JsonValue>[];
  /** Id field on admin prompt version item. */
  id: string;
  /** Lifecycle status field on admin prompt version item. */
  lifecycleStatus: string;
  /** Model constraints field on admin prompt version item. */
  modelConstraints: Record<string, JsonValue>;
  /** Organization id field on admin prompt version item. */
  organizationId: string;
  /** Output schema field on admin prompt version item. */
  outputSchema: Record<string, JsonValue>;
  /** Prompt id field on admin prompt version item. */
  promptId: string;
  /** Published at field on admin prompt version item. */
  publishedAt?: string | null;
  /** Review comment field on admin prompt version item. */
  reviewComment?: string | null;
  /** Review status field on admin prompt version item. */
  reviewStatus: string;
  /** Safety policy field on admin prompt version item. */
  safetyPolicy: Record<string, JsonValue>;
  /** Tenant id field on admin prompt version item. */
  tenantId: string;
  /** Title field on admin prompt version item. */
  title: string;
  /** Updated at field on admin prompt version item. */
  updatedAt: string;
  /** Uuid field on admin prompt version item. */
  uuid: string;
  /** Variable schema field on admin prompt version item. */
  variableSchema: Record<string, JsonValue>;
  /** Version no field on admin prompt version item. */
  versionNo: string;
}
