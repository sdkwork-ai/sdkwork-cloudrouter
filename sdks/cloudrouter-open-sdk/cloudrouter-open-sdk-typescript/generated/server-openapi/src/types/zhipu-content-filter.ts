import type { ProviderJsonValue } from './provider-json-value';

/** Zhipu content-safety verdict. */
export interface ZhipuContentFilter {
  /** Severity from 0 (most severe) to 3 (mild). */
  level?: number;
  /** Stage the safety check applied to. */
  role?: 'assistant' | 'user' | 'history';
}
