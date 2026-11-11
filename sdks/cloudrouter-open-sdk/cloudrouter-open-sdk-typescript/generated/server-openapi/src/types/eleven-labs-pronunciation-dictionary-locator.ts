import type { ProviderJsonValue } from './provider-json-value';

/** ElevenLabs pronunciation dictionary version locator. */
export interface ElevenLabsPronunciationDictionaryLocator {
  /** Pronunciation dictionary id. */
  pronunciation_dictionary_id: string;
  /** Dictionary version id; omit to use the latest version. */
  version_id?: string;
}
