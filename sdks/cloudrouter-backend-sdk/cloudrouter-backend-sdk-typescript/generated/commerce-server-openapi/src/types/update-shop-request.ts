export interface UpdateShopRequest {
  shopName?: string;
  businessModel?: string;
  storefrontStatus?: string;
  logoMediaResourceId?: string;
  coverMediaResourceId?: string;
  defaultCurrencyCode?: string;
  defaultLocale?: string;
  timezone?: string;
  contactSnapshot?: Record<string, unknown>;
  operationConfig?: Record<string, unknown>;
  version?: number;
}
