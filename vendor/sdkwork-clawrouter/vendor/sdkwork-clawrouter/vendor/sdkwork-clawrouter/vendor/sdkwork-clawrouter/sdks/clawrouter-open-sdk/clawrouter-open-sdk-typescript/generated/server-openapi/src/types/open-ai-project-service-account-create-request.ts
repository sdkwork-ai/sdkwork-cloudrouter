import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a project service account. */
export interface OpenAiProjectServiceAccountCreateRequest {
  /** Human-readable service account name. */
  name: string;
  /** Project role identifier. */
  role?: string;
}
