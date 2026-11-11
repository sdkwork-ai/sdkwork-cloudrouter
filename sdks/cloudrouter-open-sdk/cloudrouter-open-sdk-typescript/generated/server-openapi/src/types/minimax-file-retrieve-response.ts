import type { MinimaxBaseResp } from './minimax-base-resp';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax file metadata and its download URL. */
export interface MinimaxFileRetrieveResponse {
  /** Base resp field on the minimax file retrieve response, using the minimax base resp module. */
  base_resp?: MinimaxBaseResp;
  /** File envelope carrying download_url, file_id, bytes, filename, and created_at. */
  file?: Record<string, ProviderJsonValue>;
}
