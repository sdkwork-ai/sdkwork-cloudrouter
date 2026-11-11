import type { BytedanceTtsRequestParams } from './bytedance-tts-request-params';
import type { ProviderJsonValue } from './provider-json-value';

/** ByteDance Seed TTS 2.0 request (`POST /api/v3/tts/unidirectional`). The vendor nests every synthesis field under `req_params`. */
export interface BytedanceSpeechRequest {
  /** Req params field on the bytedance speech request, using the bytedance tts request params module. */
  req_params: BytedanceTtsRequestParams;
}
