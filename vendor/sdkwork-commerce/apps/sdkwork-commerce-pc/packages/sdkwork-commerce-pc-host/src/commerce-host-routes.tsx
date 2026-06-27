import { Route } from 'react-router-dom';

import {
  SdkworkCommerceHostCheckoutPage,
  SdkworkCommerceHostMembershipPage,
  SdkworkCommerceHostPaymentPage,
  SdkworkCommerceHostWalletPage,
} from './commerce-host-pages.tsx';

export type {
  SdkworkCommerceHostRouteDefinition,
  SdkworkCommerceHostRouteId,
} from './commerce-host-route-catalog.ts';
export { SDKWORK_COMMERCE_HOST_ROUTE_CATALOG } from './commerce-host-route-catalog.ts';

export type SdkworkCommerceHostRoutesProps = {
  routePrefix?: string;
};

export function SdkworkCommerceHostRoutes({
  routePrefix,
}: SdkworkCommerceHostRoutesProps) {
  return (
    <>
      <Route
        path="wallet"
        element={<SdkworkCommerceHostWalletPage routePrefix={routePrefix} />}
      />
      <Route
        path="memberships"
        element={
          <SdkworkCommerceHostMembershipPage routePrefix={routePrefix} />
        }
      />
      <Route
        path="checkout"
        element={
          <SdkworkCommerceHostCheckoutPage routePrefix={routePrefix} />
        }
      />
      <Route
        path="payment"
        element={<SdkworkCommerceHostPaymentPage routePrefix={routePrefix} />}
      />
    </>
  );
}
