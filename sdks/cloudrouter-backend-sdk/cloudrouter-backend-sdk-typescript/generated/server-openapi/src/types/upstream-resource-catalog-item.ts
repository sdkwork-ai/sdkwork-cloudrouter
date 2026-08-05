/** Upstream resource catalog item schema exposed by Cloud Router. */
export interface UpstreamResourceCatalogItem {
  /** Api endpoint code field on upstream resource catalog item. */
  apiEndpointCode: string | null;
  /** Capabilities field on upstream resource catalog item. */
  capabilities: string[];
  /** Capability field on upstream resource catalog item. */
  capability: string | null;
  /** Display name field on upstream resource catalog item. */
  displayName: string;
  /** Modality code field on upstream resource catalog item. */
  modalityCode: string | null;
  /** Resource code field on upstream resource catalog item. */
  resourceCode: string;
  /** Resource type field on upstream resource catalog item. */
  resourceType: string;
  /** Sort order field on upstream resource catalog item. */
  sortOrder: string | null;
  /** Vendor code field on upstream resource catalog item. */
  vendorCode: string | null;
}
