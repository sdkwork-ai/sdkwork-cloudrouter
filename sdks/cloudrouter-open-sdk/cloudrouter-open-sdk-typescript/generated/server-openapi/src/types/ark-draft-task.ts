import type { ProviderJsonValue } from './provider-json-value';

/** Ark draft video task reference used to promote a preview video into a final video. */
export interface ArkDraftTask {
  /** Draft video task id returned by an earlier create call with `draft: true`. */
  id: string;
}
