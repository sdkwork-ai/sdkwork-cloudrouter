/** Upstream supplier schema exposed by Claw Router. */
export interface UpstreamSupplier {
  /** Adapter code field on upstream supplier. */
  adapterCode: string;
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
  /** Protocol code field on upstream supplier. */
  protocolCode: string;
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
