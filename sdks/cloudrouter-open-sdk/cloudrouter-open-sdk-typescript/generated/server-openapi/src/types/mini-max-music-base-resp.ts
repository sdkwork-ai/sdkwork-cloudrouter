import type { ProviderJsonValue } from './provider-json-value';

/** Mini max music base resp schema exposed by Cloud Router. */
export interface MiniMaxMusicBaseResp {
  /** MiniMax status code; 0 means success. */
  status_code?: number;
  /** MiniMax status message. */
  status_msg?: string;
}
