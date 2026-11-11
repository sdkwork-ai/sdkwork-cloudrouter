import type { ProviderJsonValue } from './provider-json-value';

/** Ark tool configuration. */
export interface ArkWebSearchTool {
  /** Tool type; `web_search` lets the model decide whether to search the web. */
  type: 'web_search';
}
