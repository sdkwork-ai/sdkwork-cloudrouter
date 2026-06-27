import type { ProviderJsonValue } from './provider-json-value';

/** Item module returned inside the listOrganizationCertificates list response. */
export interface ListOrganizationCertificatesItem {
  /** Unix timestamp in seconds when the object was created. */
  created?: string;
  /** Unix timestamp in seconds when the object was created. */
  created_at?: string;
  /** User or invite email address. */
  email?: string;
  /** Resource identifier returned by the selected upstream. */
  id?: string;
  /** Developer-defined or provider-returned metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Human-readable administrative resource name. */
  name?: string;
  /** OpenAI-compatible object type. */
  object?: string;
  /** Project identifier associated with the resource. */
  project_id?: string;
  /** Role identifier or role name. */
  role?: string;
  /** Current resource status when returned by the selected upstream. */
  status?: string;
}
