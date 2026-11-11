import type { ArkVideoToolUsage } from './ark-video-tool-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Ark video generation token usage. */
export interface ArkVideoUsage {
  /** Output tokens billed for the generated video. */
  completion_tokens?: number;
  /** Tool usage for the request. */
  tool_usage?: ArkVideoToolUsage;
  /** Total tokens; input tokens are not counted, so it equals `completion_tokens`. */
  total_tokens?: number;
}
