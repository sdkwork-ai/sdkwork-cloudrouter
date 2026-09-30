import {
  createClient as createCloudRouterBackendClient,
  type SdkworkBackendClient as SdkworkCloudRouterBackendClient,
  type SdkworkBackendConfig,
} from "../generated/server-openapi/src/index";
import {
  createClient as createCommerceBackendClient,
  type SdkworkBackendClient as SdkworkCommerceBackendClient,
} from "../generated/commerce-server-openapi/src/index";

export type SdkworkCloudRouterBackendClientConfig = SdkworkBackendConfig;

/**
 * Federated commerce backend-admin domain surface carried by the Cloud
 * Router backend API.
 *
 * The transport namespaces are produced by the SDK generator from the
 * commerce backend API authority (materialized under
 * `generated/commerce-server-openapi/`); this facade only groups them under
 * the `commerce` domain so backend-admin consumers address every federated
 * commerce capability through one client.
 */
export type SdkworkCloudRouterBackendCommerceDomains = Pick<
  SdkworkCommerceBackendClient,
  | "shops"
  | "catalog"
  | "inventory"
  | "orders"
  | "payments"
  | "refunds"
  | "afterSales"
  | "fulfillments"
  | "shipments"
  | "entitlements"
  | "memberships"
  | "recharges"
  | "wallet"
  | "promotions"
  | "invoices"
  | "commerceReports"
  | "reports"
  | "audit"
>;

export type SdkworkCloudRouterBackendDomainsClient = SdkworkCloudRouterBackendClient & {
  commerce: SdkworkCloudRouterBackendCommerceDomains;
};

const COMMERCE_BACKEND_DOMAIN_KEYS = [
  "shops",
  "catalog",
  "inventory",
  "orders",
  "payments",
  "refunds",
  "afterSales",
  "fulfillments",
  "shipments",
  "entitlements",
  "memberships",
  "recharges",
  "wallet",
  "promotions",
  "invoices",
  "commerceReports",
  "reports",
  "audit",
] as const;

export function createDomainsClient(
  config: SdkworkCloudRouterBackendClientConfig,
): SdkworkCloudRouterBackendDomainsClient {
  const baseClient = createCloudRouterBackendClient(config);
  const commerceClient = createCommerceBackendClient(config);
  const commerce = Object.fromEntries(
    COMMERCE_BACKEND_DOMAIN_KEYS.map((domainKey) => [domainKey, commerceClient[domainKey]]),
  ) as SdkworkCloudRouterBackendCommerceDomains;
  const domainsClient = baseClient as SdkworkCloudRouterBackendDomainsClient;
  domainsClient.commerce = commerce;
  const forwardBaseTokenManager = baseClient.setTokenManager.bind(baseClient);
  domainsClient.setTokenManager = (manager): SdkworkCloudRouterBackendDomainsClient => {
    commerceClient.setTokenManager(manager);
    forwardBaseTokenManager(manager);
    return domainsClient;
  };
  return domainsClient;
}

export function createClient(
  config: SdkworkCloudRouterBackendClientConfig,
): SdkworkCloudRouterBackendDomainsClient {
  return createDomainsClient(config);
}
