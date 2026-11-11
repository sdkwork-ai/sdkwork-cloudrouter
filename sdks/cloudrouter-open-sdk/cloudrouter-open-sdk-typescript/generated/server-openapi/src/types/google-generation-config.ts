import type { GoogleSchema } from './google-schema';
import type { GoogleThinkingConfig } from './google-thinking-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google generation config schema exposed by Cloud Router vendor routing. */
export interface GoogleGenerationConfig {
  /** Audio transcription configuration. */
  audioTranscriptionConfig?: Record<string, ProviderJsonValue>;
  /** Number of response candidates to generate. */
  candidateCount?: number;
  /** Detect emotions and adapt responses accordingly. */
  enableAffectiveDialog?: boolean;
  /** Enable enhanced civic answers when the model supports it. */
  enableEnhancedCivicAnswers?: boolean;
  /** Frequency penalty applied to the next token's logprobs. */
  frequencyPenalty?: number;
  /** Configuration for image generation. */
  imageConfig?: Record<string, ProviderJsonValue>;
  /** Number of top logprobs to return; only valid when `responseLogprobs` is true. */
  logprobs?: number;
  /** Maximum output token count. */
  maxOutputTokens?: number;
  /** Media resolution for the request. */
  mediaResolution?: 'MEDIA_RESOLUTION_UNSPECIFIED' | 'MEDIA_RESOLUTION_LOW' | 'MEDIA_RESOLUTION_MEDIUM' | 'MEDIA_RESOLUTION_HIGH';
  /** Presence penalty applied to the next token's logprobs. */
  presencePenalty?: number;
  /** Configuration for the response output format. */
  responseFormat?: Record<string, ProviderJsonValue>;
  /** Response json schema field on the google generation config, using the provider json value module. */
  responseJsonSchema?: ProviderJsonValue;
  /** Export logprobs results in the response. */
  responseLogprobs?: boolean;
  /** Requested response MIME type. */
  responseMimeType?: string;
  /** Requested response modalities, for example TEXT and IMAGE. */
  responseModalities?: string[];
  /** Response schema field on the google generation config, using the google schema module. */
  responseSchema?: GoogleSchema;
  /** Seed used in decoding. */
  seed?: number;
  /** Speech generation configuration. */
  speechConfig?: Record<string, ProviderJsonValue>;
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
  /** Translation configuration. */
  translationConfig?: Record<string, ProviderJsonValue>;
}
