import type { OpenAiProjectApiKey } from './open-ai-project-api-key';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible project service account object. */
export interface OpenAiProjectServiceAccount {
  /** Api key field on the open ai project service account, using the open ai project api key module. */
  api_key?: OpenAiProjectApiKey;
  /** Unix timestamp in seconds when the service account was created. */
  created_at?: string;
  /** Service account identifier. */
  id: string;
  /** Human-readable service account name. */
  name: string;
  /** Object type, normally project.service_account. */
  object: 'project.service_account';
  /** Project role identifier. */
  role?: string;
}
