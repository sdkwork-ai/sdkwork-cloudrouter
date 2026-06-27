import type { OpenAiError } from './open-ai-error';

/** OpenAI-compatible open ai error envelope schema exposed by Claw Router. */
export interface OpenAiErrorEnvelope {
  /** Error field on the open ai error envelope, using the open ai error module. */
  error: OpenAiError;
}
