import type { OpenAiResponseInputContentPart } from './open-ai-response-input-content-part';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response input item schema exposed by Claw Router. */
export interface OpenAiResponseInputItem {
  /** Input item content as text or typed input content parts. */
  content?: string | OpenAiResponseInputContentPart[];
  /** Input item identifier when referencing an existing item. */
  id?: string;
  /** Input item role, commonly user, assistant, developer, or system. */
  role?: 'developer' | 'system' | 'user' | 'assistant' | 'tool' | 'function';
  /** Input item status when supplied by upstream state. */
  status?: string;
  /** Input item type when using typed Responses API items. */
  type?: string;
}
