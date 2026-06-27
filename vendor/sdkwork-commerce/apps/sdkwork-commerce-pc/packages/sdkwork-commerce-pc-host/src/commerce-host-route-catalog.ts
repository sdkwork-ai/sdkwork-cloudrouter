export type SdkworkCommerceHostRouteId =
  | 'wallet'
  | 'memberships'
  | 'checkout'
  | 'payment';

export type SdkworkCommerceHostRouteDefinition = {
  id: SdkworkCommerceHostRouteId;
  segment: string;
  /** When true, route is omitted from console sidebar navigation. */
  hidden: boolean;
};

export const SDKWORK_COMMERCE_HOST_ROUTE_CATALOG: readonly SdkworkCommerceHostRouteDefinition[] =
  [
    { id: 'wallet', segment: 'wallet', hidden: false },
    { id: 'memberships', segment: 'memberships', hidden: false },
    { id: 'checkout', segment: 'checkout', hidden: true },
    { id: 'payment', segment: 'payment', hidden: true },
  ] as const;
