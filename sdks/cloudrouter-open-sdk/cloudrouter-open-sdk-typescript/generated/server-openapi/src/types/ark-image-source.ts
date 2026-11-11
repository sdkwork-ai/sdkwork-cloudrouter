import type { ProviderJsonValue } from './provider-json-value';

/** Ark image content source. */
export interface ArkImageSource {
  /** Image URL, `data:image/<format>;base64,<data>` payload, or `asset://<id>` asset reference. */
  url: string;
}
