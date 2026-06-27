import type { OpenAiTopLogprob } from './open-ai-top-logprob';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai token logprob schema exposed by Claw Router. */
export interface OpenAiTokenLogprob {
  /** UTF-8 bytes for the token when returned. */
  bytes?: number[];
  /** Token log probability. */
  logprob: number;
  /** Token text. */
  token: string;
  /** Most likely token options at this position. */
  top_logprobs?: OpenAiTopLogprob[];
}
