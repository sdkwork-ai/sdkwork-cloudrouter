import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai prompt reference schema exposed by Claw Router. */
export interface OpenAiPromptReference {
  /** Reusable prompt identifier. */
  id?: string;
  /** Prompt variables supplied by the caller. */
  variables?: Record<string, ProviderJsonValue>;
  /** Reusable prompt version. */
  version?: string;
}
