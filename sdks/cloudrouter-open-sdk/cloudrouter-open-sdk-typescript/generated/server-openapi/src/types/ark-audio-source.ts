import type { ProviderJsonValue } from './provider-json-value';

/** Ark audio content source. */
export interface ArkAudioSource {
  /** Audio URL, `data:audio/<format>;base64,<data>` payload, or `asset://<id>` asset reference. */
  url: string;
}
