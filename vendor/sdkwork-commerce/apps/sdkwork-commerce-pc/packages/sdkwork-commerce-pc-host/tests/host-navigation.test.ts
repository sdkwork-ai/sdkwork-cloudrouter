import { describe, expect, it } from "vitest";

import {
  createCommerceHostNavigator,
  mapCommerceRouteToHost,
} from "../src/commerce-host-navigation.ts";
import { resolveCommerceHostPaths } from "../src/commerce-host-config.ts";
import { SDKWORK_COMMERCE_HOST_ROUTE_CATALOG } from "../src/commerce-host-route-catalog.ts";

describe("commerce host navigation", () => {
  it("resolveCommerceHostPaths builds console-scoped commerce routes", () => {
    expect(resolveCommerceHostPaths({ routePrefix: "/console" })).toEqual({
      routePrefix: "/console",
      walletPath: "/console/wallet",
      membershipsPath: "/console/memberships",
      checkoutPath: "/console/checkout",
      paymentPath: "/console/payment",
    });
  });

  it("mapCommerceRouteToHost maps commerce routes into host prefix", () => {
    expect(
      mapCommerceRouteToHost("/checkout?kind=subscription", { routePrefix: "/console" }),
    ).toBe("/console/checkout?kind=subscription");
    expect(
      mapCommerceRouteToHost("/payments?paymentId=pay-1", { routePrefix: "/console" }),
    ).toBe("/console/payment?paymentId=pay-1");
    expect(mapCommerceRouteToHost("/wallet", { routePrefix: "/console" })).toBe("/console/wallet");
  });

  it("createCommerceHostNavigator maps routes through navigate callback", () => {
    const routes: string[] = [];
    const navigate = createCommerceHostNavigator((route) => {
      routes.push(route);
    }, { routePrefix: "/console" });
    navigate("/wallet");
    expect(routes).toEqual(["/console/wallet"]);
    expect(SDKWORK_COMMERCE_HOST_ROUTE_CATALOG.length).toBeGreaterThan(0);
  });
});
