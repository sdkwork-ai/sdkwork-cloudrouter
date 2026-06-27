import type { OpenAiTokenLogprob } from './open-ai-token-logprob';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai choice logprobs schema exposed by Claw Router. */
export interface OpenAiChoiceLogprobs {
  /** Token log probabilities for generated content. */
  content?: OpenAiTokenLogprob[];
  /** Token log probabilities for refusal content. */
  refusal?: OpenAiTokenLogprob[];
}
