import type { ProviderJsonValue } from './provider-json-value';

/** One generated Zhipu image. */
export interface ZhipuImageResult {
  /** Image URL; the temporary link is valid for 30 days. */
  url: string;
}
