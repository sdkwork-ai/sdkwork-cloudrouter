export interface CreateShopRequest {
  organizationId: string;
  shopName: string;
  shopType: string;
  businessModel: string;
  defaultCurrencyCode: string;
  defaultLocale?: string;
  timezone?: string;
  contactSnapshot?: Record<string, unknown>;
  operationConfig?: Record<string, unknown>;
}
