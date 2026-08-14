import type { LlmProtocolConfig } from './llm-protocol-config';
import type { UpstreamSupplierModelListEntry } from './upstream-supplier-model-list-entry';

/** Update upstream supplier request schema exposed by Cloud Router. */
export interface UpdateUpstreamSupplierRequest {
  /** Adapter code field on update upstream supplier request. */
  adapterCode?: string;
  /** Default vendor code field on update upstream supplier request. */
  defaultVendorCode?: string | null;
  /** Description field on update upstream supplier request. */
  description?: string | null;
  /** Display name field on update upstream supplier request. */
  displayName?: string | null;
  /** Docs url field on update upstream supplier request. */
  docsUrl?: string | null;
  /** Environment field on update upstream supplier request. */
  environment?: number | null;
  /** Model blacklist of vendor + model entries for this supplier. */
  modelBlacklist?: UpstreamSupplierModelListEntry[] | null;
  /** Model whitelist of vendor + model entries for this supplier. */
  modelWhitelist?: UpstreamSupplierModelListEntry[] | null;
  /** Protocols field on update upstream supplier request. */
  protocols?: LlmProtocolConfig[];
  /** Region code field on update upstream supplier request. */
  regionCode?: string | null;
  /** Sort order field on update upstream supplier request. */
  sortOrder?: number | null;
  /** Status field on update upstream supplier request. */
  status?: number | null;
  /** Supplier name field on update upstream supplier request. */
  supplierName?: string;
  /** Supplier type field on update upstream supplier request. */
  supplierType?: 'official' | 'relay';
  /** Website url field on update upstream supplier request. */
  websiteUrl?: string | null;
}
