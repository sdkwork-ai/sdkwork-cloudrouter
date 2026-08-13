/** Llm protocol config schema exposed by Cloud Router. */
export interface LlmProtocolConfig {
  /** Base url field on llm protocol config. */
  baseUrl: string;
  /** Protocol code field on llm protocol config. */
  protocolCode: 'openai_chat_completions' | 'openai_responses' | 'anthropic_messages';
}
