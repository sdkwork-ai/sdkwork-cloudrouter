import type { ProviderJsonValue } from './provider-json-value';

/** Ark tool usage counters. */
export interface ArkVideoToolUsage {
  /** Number of web search calls made; 0 means the tool was not used. */
  web_search?: number;
}
