import type { ProviderJsonValue } from './provider-json-value';

/** Ark video content source. */
export interface ArkVideoSource {
  /** Video URL or `asset://<id>` asset reference. */
  url: string;
}
