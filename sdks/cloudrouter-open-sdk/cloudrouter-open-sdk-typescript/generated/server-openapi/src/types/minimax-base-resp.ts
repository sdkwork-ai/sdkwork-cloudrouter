import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax business status envelope returned by every media endpoint. */
export interface MinimaxBaseResp {
  /** MiniMax business status code; 0 means success. */
  status_code?: number;
  /** MiniMax business status message. */
  status_msg?: string;
}
