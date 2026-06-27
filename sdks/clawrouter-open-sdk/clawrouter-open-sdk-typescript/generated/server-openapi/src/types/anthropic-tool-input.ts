import type { ProviderJsonValue } from './provider-json-value';

/** JSON input object supplied to or returned from an Anthropic tool use. */
export interface AnthropicToolInput {
  [key: string]: ProviderJsonValue;
}