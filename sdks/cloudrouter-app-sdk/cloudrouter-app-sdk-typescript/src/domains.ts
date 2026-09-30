import {
  createClient as createCloudRouterAppClient,
  type SdkworkAppClient as SdkworkCloudRouterAppClient,
  type SdkworkAppConfig,
} from "../generated/server-openapi/src/index";
import {
  createClient as createCommerceAppClient,
  type SdkworkAppClient as SdkworkCommerceAppClient,
} from "../generated/commerce-server-openapi/src/index";

export type SdkworkCloudRouterAppClientConfig = SdkworkAppConfig;

/**
 * Federated commerce domain surface carried by the Cloud Router app API.
 *
 * The transport namespaces are produced by the SDK generator from the
 * commerce app API authority (materialized under
 * `generated/commerce-server-openapi/`); this facade only groups them under
 * the `commerce` domain so consumers address every federated commerce
 * capability through one client.
 */
export type SdkworkCloudRouterCommerceDomains = Pick<
  SdkworkCommerceAppClient,
  | "accounts"
  | "shops"
  | "catalog"
  | "cart"
  | "addresses"
  | "checkout"
  | "orders"
  | "payments"
  | "refunds"
  | "afterSales"
  | "fulfillments"
  | "shipments"
  | "memberships"
  | "recharges"
  | "billing"
  | "wallet"
  | "promotions"
  | "invoices"
>;

export type SdkworkCloudRouterDomainsClient = SdkworkCloudRouterAppClient & {
  commerce: SdkworkCloudRouterCommerceDomains;
};

const COMMERCE_DOMAIN_KEYS = [
  "accounts",
  "shops",
  "catalog",
  "cart",
  "addresses",
  "checkout",
  "orders",
  "payments",
  "refunds",
  "afterSales",
  "fulfillments",
  "shipments",
  "memberships",
  "recharges",
  "billing",
  "wallet",
  "promotions",
  "invoices",
] as const;

export function createDomainsClient(
  config: SdkworkCloudRouterAppClientConfig,
): SdkworkCloudRouterDomainsClient {
  const baseClient = createCloudRouterAppClient(config);
  const commerceClient = createCommerceAppClient(config);
  const commerce = Object.fromEntries(
    COMMERCE_DOMAIN_KEYS.map((domainKey) => [domainKey, commerceClient[domainKey]]),
  ) as SdkworkCloudRouterCommerceDomains;
  const domainsClient = baseClient as SdkworkCloudRouterDomainsClient;
  domainsClient.commerce = commerce;
  const forwardBaseTokenManager = baseClient.setTokenManager.bind(baseClient);
  domainsClient.setTokenManager = (manager): SdkworkCloudRouterDomainsClient => {
    commerceClient.setTokenManager(manager);
    forwardBaseTokenManager(manager);
    return domainsClient;
  };
  return domainsClient;
}

export function createClient(
  config: SdkworkCloudRouterAppClientConfig,
): SdkworkCloudRouterDomainsClient {
  return createDomainsClient(config);
}
