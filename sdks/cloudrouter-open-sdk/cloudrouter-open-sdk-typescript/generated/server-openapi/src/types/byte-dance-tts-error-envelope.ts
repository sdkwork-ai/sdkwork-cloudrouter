import type { ProviderJsonValue } from './provider-json-value';

/** Error body defined by the ByteDance OpenSpeech TTS API. */
export interface ByteDanceTtsErrorEnvelope {
  /** ByteDance OpenSpeech business error code. */
  code?: number;
  /** ByteDance OpenSpeech error message. */
  message?: string;
  /** ByteDance OpenSpeech request identifier. */
  reqid?: string;
}
