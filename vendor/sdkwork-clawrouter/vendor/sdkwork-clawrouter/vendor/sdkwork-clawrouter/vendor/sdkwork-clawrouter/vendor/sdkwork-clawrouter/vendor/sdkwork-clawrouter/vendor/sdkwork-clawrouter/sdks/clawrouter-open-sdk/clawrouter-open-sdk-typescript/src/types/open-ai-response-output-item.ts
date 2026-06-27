import type { OpenAiResponseOutputContent } from './open-ai-response-output-content';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response output item schema exposed by Claw Router. */
export interface OpenAiResponseOutputItem {
  /** Content parts for message output items. */
  content?: OpenAiResponseOutputContent[];
  /** Output item identifier. */
  id?: string;
  /** Role for message output items. */
  role?: 'developer' | 'system' | 'user' | 'assistant' | 'tool' | 'function';
  /** Status for the output item. */
  status?: string;
  /** Output item type. */
  type: 'message' | 'function_call' | 'web_search_call' | 'file_search_call' | 'computer_call' | 'reasoning';
}
