/**
 * Route contract of the Smart Hardware Market.
 *
 * The storefront lives on the public portal surface (same shell and navbar as
 * the rest of the marketing pages) and its product detail page is deep-linkable
 * so an operator can share one hardware SKU.
 */

export const HARDWARE_MARKET_ROUTE_PATH = '/hardware-market' as const;

export const HARDWARE_MARKET_PRODUCT_ROUTE_PATH = '/hardware-market/product/:productId' as const;

export function buildHardwareMarketProductPath(productId: string): string {
  return `${HARDWARE_MARKET_ROUTE_PATH}/product/${encodeURIComponent(productId)}`;
}

export const hardwareMarketRoutes = [
  {
    path: HARDWARE_MARKET_ROUTE_PATH,
    capability: 'hardware-market',
    surface: 'app',
  },
  {
    path: HARDWARE_MARKET_PRODUCT_ROUTE_PATH,
    capability: 'hardware-market',
    surface: 'app',
  },
] as const;
