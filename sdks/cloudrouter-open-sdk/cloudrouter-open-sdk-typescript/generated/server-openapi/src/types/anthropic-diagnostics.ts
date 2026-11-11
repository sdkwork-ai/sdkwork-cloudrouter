import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic request diagnostics. */
export interface AnthropicDiagnostics {
  /** Previous `msg_...` id used to explain prompt-cache divergence. */
  previous_message_id?: string;
}
