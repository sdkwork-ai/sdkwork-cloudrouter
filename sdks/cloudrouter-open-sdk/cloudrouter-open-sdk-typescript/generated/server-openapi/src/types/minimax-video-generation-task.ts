import type { MinimaxBaseResp } from './minimax-base-resp';
import type { ProviderJsonValue } from './provider-json-value';

/** MiniMax asynchronous video generation task, its status, and the produced file id. */
export interface MinimaxVideoGenerationTask {
  /** Base resp field on the minimax video generation task, using the minimax base resp module. */
  base_resp?: MinimaxBaseResp;
  /** Generated file identifier; resolve it to a URL through the file retrieve endpoint. */
  file_id?: string;
  /** Task status. */
  status?: 'Preparing' | 'Queueing' | 'Processing' | 'Success' | 'Fail';
  /** MiniMax video generation task identifier. */
  task_id?: string;
  /** Generated video height in pixels. */
  video_height?: number;
  /** Generated video width in pixels. */
  video_width?: number;
}
