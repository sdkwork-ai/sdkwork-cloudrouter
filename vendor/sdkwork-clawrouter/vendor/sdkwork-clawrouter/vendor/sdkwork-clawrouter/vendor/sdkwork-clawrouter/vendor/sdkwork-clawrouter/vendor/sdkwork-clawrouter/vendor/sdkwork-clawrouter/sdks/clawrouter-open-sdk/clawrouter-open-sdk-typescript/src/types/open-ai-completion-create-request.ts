import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a legacy text completion. */
export interface OpenAiCompletionCreateRequest {
  /** Number of server-side completions to generate before selecting the best result. */
  best_of?: number;
  /** Whether to echo the prompt in the response. */
  echo?: boolean;
  /** Penalty applied to repeated tokens. */
  frequency_penalty?: number;
  /** Token bias map keyed by token id. */
  logit_bias?: Record<string, number>;
  /** Number of token log probabilities to return. */
  logprobs?: number;
  /** Maximum number of tokens to generate. */
  max_tokens?: number;
  /** Model id or Claw Router catalog key routed to a provider account. */
  model: string;
  /** Number of completion choices to generate. */
  n?: number;
  /** Penalty applied to tokens based on whether they appear in the prompt. */
  presence_penalty?: number;
  /** Prompt text, prompt array, token array, or token-array batch to complete. */
  prompt: string | string[] | number[] | number[][];
  /** Best-effort deterministic sampling seed. */
  seed?: string;
  /** Stop sequence or list of stop sequences. */
  stop?: string | string[];
  /** Whether to stream completion chunks. */
  stream?: boolean;
  /** Suffix inserted after the generated completion when supported. */
  suffix?: string;
  /** Sampling temperature between 0 and 2. */
  temperature?: number;
  /** Nucleus sampling probability mass. */
  top_p?: number;
  /** End-user identifier forwarded to compatible upstreams. */
  user?: string;
}
