import type { UpstreamResourceCatalogItem } from './upstream-resource-catalog-item';
import type { UpstreamResourceGroupCatalogItem } from './upstream-resource-group-catalog-item';

/** Upstream resource catalog response schema exposed by Cloud Router. */
export interface UpstreamResourceCatalogResponse {
  /** Resource groups field on upstream resource catalog response. */
  resourceGroups: UpstreamResourceGroupCatalogItem[];
  /** Resources field on upstream resource catalog response. */
  resources: UpstreamResourceCatalogItem[];
}
