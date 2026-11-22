import type { AppRoutingModelGroupCatalogModel } from './app-routing-model-group-catalog-model';

/** App routing model group catalog vendor schema exposed by Cloud Router. */
export interface AppRoutingModelGroupCatalogVendor {
  /** Models field on app routing model group catalog vendor. */
  models: AppRoutingModelGroupCatalogModel[];
  /** Vendor code field on app routing model group catalog vendor. */
  vendorCode: string;
  /** Vendor name field on app routing model group catalog vendor. */
  vendorName: string;
}
