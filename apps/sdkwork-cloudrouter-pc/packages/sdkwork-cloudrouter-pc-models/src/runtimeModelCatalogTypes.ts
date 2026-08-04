export interface AppModelCatalogPriceAvailability {
  status: 'reference' | 'unavailable';
  reason?: string;
}

export interface AppModelCatalogItem {
  priceAvailability?: AppModelCatalogPriceAvailability;
}
