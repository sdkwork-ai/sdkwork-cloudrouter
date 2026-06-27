import type { OpenAiTokenUsage } from './open-ai-token-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listAssistants list response. */
export interface ListAssistantsItem {
  /** Message or item content returned by the upstream. */
  content?: ProviderJsonValue;
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Model id used by the response. */
  model?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Output items returned by the model. */
  output?: ProviderJsonValue[];
  /** Message role when the object represents a message. */
  role?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
  /** Usage field on the list assistants item, using the open ai token usage module. */
  usage?: OpenAiTokenUsage;
}
