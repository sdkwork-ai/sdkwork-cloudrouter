/** Upstream resource group catalog item schema exposed by Cloud Router. */
export interface UpstreamResourceGroupCatalogItem {
  /** Capabilities field on upstream resource group catalog item. */
  capabilities: string[];
  /** Description field on upstream resource group catalog item. */
  description: string | null;
  /** Group code field on upstream resource group catalog item. */
  groupCode: string;
  /** Group name field on upstream resource group catalog item. */
  groupName: string;
  /** Group type field on upstream resource group catalog item. */
  groupType: string;
  /** Resource count field on upstream resource group catalog item. */
  resourceCount: string;
  /** Selection mode field on upstream resource group catalog item. */
  selectionMode: string;
  /** Sort order field on upstream resource group catalog item. */
  sortOrder: string | null;
  /** Vendor codes field on upstream resource group catalog item. */
  vendorCodes: string[];
}
