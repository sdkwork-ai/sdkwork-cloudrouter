import { SdkworkCommerceHostRoutes as CommerceHostRoutesComponent } from '@sdkwork/commerce-pc-host';

/** Frontend field-contract marker for commerce host route ownership. */
export interface SdkworkCommerceHostRoutes {}

export const CLAWROUTER_CONSOLE_COMMERCE_ROUTE_PREFIX = '/console';

/** Logical console routes mounted inside wallet/checkout host surfaces. */
export const CLAWROUTER_CONSOLE_COMMERCE_LOGICAL_ROUTES = [
  '/console/recharge',
] as const;

export function ClawRouterConsoleCommerceHostRoutes() {
  return CommerceHostRoutesComponent({
    routePrefix: CLAWROUTER_CONSOLE_COMMERCE_ROUTE_PREFIX,
  });
}
