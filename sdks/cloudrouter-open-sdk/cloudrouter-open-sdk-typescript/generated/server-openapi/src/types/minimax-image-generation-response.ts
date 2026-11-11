import type { MinimaxBaseResp } from './minimax-base-resp';
import type { MinimaxImageData } from './minimax-image-data';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax image generation response. */
export interface MinimaxImageGenerationResponse {
  /** Base resp field on the minimax image generation response, using the minimax base resp module. */
  base_resp?: MinimaxBaseResp;
  /** Data field on the minimax image generation response, using the minimax image data module. */
  data?: MinimaxImageData;
  /** MiniMax request identifier. */
  id?: string;
  /** Generation counters such as succeeded_count and failed_count. */
  metadata?: Record<string, ProviderJsonValue>;
}
