import type { AppRoutingModelGroupOption } from './app-routing-model-group-option';

/** App routing model group catalog model schema exposed by Cloud Router. */
export interface AppRoutingModelGroupCatalogModel {
  /** Catalog key field on app routing model group catalog model. */
  catalogKey: string;
  /** Default group codes field on app routing model group catalog model. */
  defaultGroupCodes: string[];
  /** Default source field on app routing model group catalog model. */
  defaultSource?: string | null;
  /** Display name field on app routing model group catalog model. */
  displayName: string;
  /** Groups field on app routing model group catalog model. */
  groups: AppRoutingModelGroupOption[];
  /** Modalities field on app routing model group catalog model. */
  modalities: ('text' | 'image' | 'video' | 'audio' | 'music')[];
  /** Model field on app routing model group catalog model. */
  model: string;
  /** Vendor code field on app routing model group catalog model. */
  vendorCode: string;
}
