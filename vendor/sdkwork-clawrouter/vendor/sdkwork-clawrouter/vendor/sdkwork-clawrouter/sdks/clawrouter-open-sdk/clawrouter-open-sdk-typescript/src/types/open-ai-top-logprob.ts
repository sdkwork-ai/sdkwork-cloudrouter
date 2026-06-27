import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai top logprob schema exposed by Claw Router. */
export interface OpenAiTopLogprob {
  /** UTF-8 bytes for the candidate token when returned. */
  bytes?: number[];
  /** Candidate token log probability. */
  logprob: number;
  /** Candidate token text. */
  token: string;
}
