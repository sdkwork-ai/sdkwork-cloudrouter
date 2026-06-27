import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible organization user object. */
export interface OpenAiOrganizationUser {
  /** Unix timestamp in seconds when the user was added. */
  created_at?: string;
  /** User email address. */
  email: string;
  /** Organization user identifier. */
  id: string;
  /** Developer-defined user metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** User display name. */
  name?: string;
  /** Object type, normally organization.user. */
  object: 'organization.user';
  /** Organization role identifier. */
  role?: string;
  /** User status. */
  status?: string;
}
