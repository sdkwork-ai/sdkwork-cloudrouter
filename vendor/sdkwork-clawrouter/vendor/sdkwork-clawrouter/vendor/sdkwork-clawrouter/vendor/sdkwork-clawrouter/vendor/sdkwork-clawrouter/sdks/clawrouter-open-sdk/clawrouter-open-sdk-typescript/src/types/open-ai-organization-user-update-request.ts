import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to update an organization user. */
export interface OpenAiOrganizationUserUpdateRequest {
  /** Developer-defined user metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Organization role identifier. */
  role?: string;
}
