import type { AppRoutingModelGroupCatalogVendor } from './app-routing-model-group-catalog-vendor';

/** App routing model group catalog modality schema exposed by Cloud Router. */
export interface AppRoutingModelGroupCatalogModality {
  /** Modality field on app routing model group catalog modality. */
  modality: 'text' | 'image' | 'video' | 'audio' | 'music';
  /** Vendors field on app routing model group catalog modality. */
  vendors: AppRoutingModelGroupCatalogVendor[];
}
