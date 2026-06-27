import type { AdminModelMappingModelOption } from './admin-model-mapping-model-option';
import type { AdminModelVendorItem } from './admin-model-vendor-item';

/** Admin model mapping options catalog response schema exposed by Claw Router. */
export interface AdminModelMappingOptionsCatalogResponse {
  /** Models field on admin model mapping options catalog response. */
  models: AdminModelMappingModelOption[];
  /** Vendors field on admin model mapping options catalog response. */
  vendors: AdminModelVendorItem[];
}
