export const PRICING_ROUTE_PATH = '/pricing' as const;

export const pricingRoutes = [
  {
    path: PRICING_ROUTE_PATH,
    capability: 'pricing',
    surface: 'app',
  },
] as const;
