import type { AnthropicContentBlockParam } from './anthropic-content-block-param';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message param schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageParam {
  /** Message content. */
  content: string | AnthropicContentBlockParam[];
  /** Message role. */
  role: 'user' | 'assistant';
}
