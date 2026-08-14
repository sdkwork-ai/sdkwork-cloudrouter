import type { LlmProtocolConfig } from './llm-protocol-config';
import type { UpstreamSupplierModelListEntry } from './upstream-supplier-model-list-entry';

/** Upstream supplier schema exposed by Cloud Router. */
export interface UpstreamSupplier {
  /** Adapter code field on upstream supplier. */
  adapterCode: string;
  /** Default vendor code field on upstream supplier. */
  defaultVendorCode: string | null;
  /** Description field on upstream supplier. */
  description: string | null;
  /** Display name field on upstream supplier. */
  displayName: string;
  /** Docs url field on upstream supplier. */
  docsUrl: string | null;
  /** Environment field on upstream supplier. */
  environment: number;
  /** Health status field on upstream supplier. */
  healthStatus: number;
  /** Id field on upstream supplier. */
  id: string;
  /** Model blacklist of this supplier. Vendor + model entries the supplier is forbidden to serve. An entry with an empty models array forbids every model of the vendor. The blacklist wins over the whitelist. */
  modelBlacklist: UpstreamSupplierModelListEntry[];
  /** Model whitelist of this supplier. When non-empty, the supplier serves only matching vendor + model entries. An entry with an empty models array allows every model of the vendor. */
  modelWhitelist: UpstreamSupplierModelListEntry[];
  /** Protocol code field on upstream supplier. */
  protocolCode: string;
  /** Protocols field on upstream supplier. */
  protocols: LlmProtocolConfig[];
  /** Region code field on upstream supplier. */
  regionCode: string | null;
  /** Sort order field on upstream supplier. */
  sortOrder: number;
  /** Status field on upstream supplier. */
  status: number;
  /** Supplier code field on upstream supplier. */
  supplierCode: string;
  /** Supplier name field on upstream supplier. */
  supplierName: string;
  /** Supplier type field on upstream supplier. */
  supplierType: 'official' | 'relay';
  /** Updated at field on upstream supplier. */
  updatedAt: string;
  /** Uuid field on upstream supplier. */
  uuid: string;
  /** Version field on upstream supplier. */
  version: string;
  /** Website url field on upstream supplier. */
  websiteUrl: string | null;
}
