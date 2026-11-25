import type { ProviderJsonValue } from './provider-json-value';

/** Error envelope defined by the Volcengine Ark Runtime API. */
export interface ArkErrorEnvelope {
  /** Error field on the ark error envelope schema. */
  error: { code?: string; message: string; param?: string | null; request_id: string; type: string; } & Record<string, ProviderJsonValue>;
}
