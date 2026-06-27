import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization audit log event. */
export interface OpenAiOrganizationAuditLog {
  /** Actor that performed the audited action. */
  actor?: ProviderJsonValue;
  /** API key identifier associated with the event when available. */
  api_key_id?: string;
  /** Unix timestamp in seconds when the event took effect. */
  effective_at?: string;
  /** Audit log event identifier. */
  id: string;
  /** Provider-specific audit metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally organization.audit_log. */
  object: 'organization.audit_log';
  /** Project associated with the event when available. */
  project?: ProviderJsonValue;
  /** Request details captured for the audit event. */
  request?: ProviderJsonValue;
  /** Audit event type. */
  type: string;
}
