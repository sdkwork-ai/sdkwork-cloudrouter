import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible project user object. */
export interface OpenAiProjectUser {
  /** Unix timestamp in seconds when the user was added to the project. */
  created_at?: string;
  /** User email address. */
  email: string;
  /** Project user identifier. */
  id: string;
  /** User display name. */
  name?: string;
  /** Object type, normally project.user. */
  object: 'project.user';
  /** Project role identifier. */
  role?: string;
}
