import type { GoogleSchema } from './google-schema';
import type { GoogleThinkingConfig } from './google-thinking-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google generation config schema exposed by Claw Router vendor routing. */
export interface GoogleGenerationConfig {
  /** Number of response candidates to generate. */
  candidateCount?: number;
  /** Maximum output token count. */
  maxOutputTokens?: number;
  /** Requested response MIME type. */
  responseMimeType?: string;
  /** Response schema field on the google generation config, using the google schema module. */
  responseSchema?: GoogleSchema;
  /** Stop sequences for generation. */
  stopSequences?: string[];
  /** Sampling temperature. */
  temperature?: number;
  /** Thinking config field on the google generation config, using the google thinking config module. */
  thinkingConfig?: GoogleThinkingConfig;
  /** Top-k sampling value. */
  topK?: number;
  /** Nucleus sampling probability mass. */
  topP?: number;
}
