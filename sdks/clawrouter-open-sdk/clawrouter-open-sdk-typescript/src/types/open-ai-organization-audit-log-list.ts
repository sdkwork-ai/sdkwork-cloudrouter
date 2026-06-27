import type { OpenAiOrganizationAuditLog } from './open-ai-organization-audit-log';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible paginated list of organization audit log events. */
export interface OpenAiOrganizationAuditLogList {
  /** Organization audit log events in the returned page. */
  data: OpenAiOrganizationAuditLog[];
  /** Identifier of the first object in this page when provided. */
  first_id?: string | null;
  /** Whether additional pages are available. */
  has_more?: boolean;
  /** Identifier of the last object in this page when provided. */
  last_id?: string | null;
  /** Object type, normally list. */
  object: 'list';
}
