/** Create upstream supplier request schema exposed by Claw Router. */
export interface CreateUpstreamSupplierRequest {
  /** Adapter code field on create upstream supplier request. */
  adapterCode: string;
  /** Description field on create upstream supplier request. */
  description?: string | null;
  /** Display name field on create upstream supplier request. */
  displayName?: string | null;
  /** Docs url field on create upstream supplier request. */
  docsUrl?: string | null;
  /** Environment field on create upstream supplier request. */
  environment?: number | null;
  /** Protocol code field on create upstream supplier request. */
  protocolCode: string;
  /** Region code field on create upstream supplier request. */
  regionCode?: string | null;
  /** Sort order field on create upstream supplier request. */
  sortOrder?: number | null;
  /** Status field on create upstream supplier request. */
  status?: number | null;
  /** Supplier code field on create upstream supplier request. */
  supplierCode: string;
  /** Supplier name field on create upstream supplier request. */
  supplierName: string;
  /** Supplier type field on create upstream supplier request. */
  supplierType: 'official' | 'relay';
  /** Website url field on create upstream supplier request. */
  websiteUrl?: string | null;
}
