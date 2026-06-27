import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization group object. */
export interface OpenAiOrganizationGroup {
  /** Unix timestamp in seconds when the group was created. */
  created_at?: string;
  /** Human-readable group description. */
  description?: string;
  /** Group identifier. */
  id: string;
  /** Developer-defined group metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable group name. */
  name: string;
  /** Object type, normally organization.group. */
  object: 'organization.group';
}
