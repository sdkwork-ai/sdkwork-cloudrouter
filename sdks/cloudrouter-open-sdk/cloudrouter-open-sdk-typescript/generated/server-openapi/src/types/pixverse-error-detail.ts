import type { ProviderJsonValue } from './provider-json-value';

/** PixVerse supplemental error detail. */
export interface PixverseErrorDetail {
  /** Error cause and suggested action. */
  Message?: string;
  /** Error parameters such as `Fields`, `AllowedValues`, or `RequiredField`. */
  Param?: Record<string, ProviderJsonValue>;
  /** Stable error type identifier. */
  Type?: string;
}
