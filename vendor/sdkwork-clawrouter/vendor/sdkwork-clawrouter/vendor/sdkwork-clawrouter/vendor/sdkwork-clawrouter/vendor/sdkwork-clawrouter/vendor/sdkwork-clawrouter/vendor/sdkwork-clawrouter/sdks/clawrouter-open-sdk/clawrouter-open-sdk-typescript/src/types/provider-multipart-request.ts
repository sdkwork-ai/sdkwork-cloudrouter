import type { ProviderJsonValue } from './provider-json-value';

/** Provider-specific multipart form fields and binary files. */
export interface ProviderMultipartRequest {
  [key: string]: ProviderJsonValue;
}