import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";

export interface SdkworkCommerceWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "commerce";
  routePath: string;
}

export interface CreateCommerceWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export interface SdkworkCommerceRouteIntent {
  focusWindow: boolean;
  route: string;
  sectionId?: string;
  source: "commerce-workspace";
  type: "commerce-route-intent";
}

export interface CreateCommerceRouteIntentOptions {
  basePath?: string;
  focusWindow?: boolean;
  sectionId?: string;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/commerce").trim();
  if (!normalized || normalized === "/") {
    return "/commerce";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function createCommerceWorkspaceManifest({
  description = "Commerce workspace for wallet, pricing, shared offers, points, coupons, subscriptions, billing, membership, orders, payments, and invoice-center composition across one reusable desktop hub.",
  host,
  id = "sdkwork-commerce",
  packageNames = [
    "@sdkwork/commerce-pc-commerce",
    "@sdkwork/commerce-pc-billing",
    "@sdkwork/commerce-pc-checkout",
    "@sdkwork/commerce-pc-entitlement",
    "@sdkwork/commerce-pc-offer",
    "@sdkwork/commerce-pc-pricing",
    "@sdkwork/commerce-pc-wallet",
    "@sdkwork/commerce-pc-points",
    "@sdkwork/commerce-pc-membership",
    "@sdkwork/commerce-pc-membership-purchase",
    "@sdkwork/commerce-pc-coupon",
    "@sdkwork/commerce-pc-subscription",
    "@sdkwork/commerce-pc-order",
    "@sdkwork/commerce-pc-payment",
    "@sdkwork/commerce-pc-invoice",
  ],
  routePath = "/commerce",
  theme,
  title = "Commerce",
}: CreateCommerceWorkspaceManifestOptions = {}): SdkworkCommerceWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "commerce",
    routePath: normalizeBasePath(routePath),
  };
}

export function createCommerceRouteIntent(
  options: CreateCommerceRouteIntentOptions = {},
): SdkworkCommerceRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.sectionId) {
    queryParams.set("section", options.sectionId);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    route: `${basePath}${querySuffix}`,
    ...(options.sectionId ? { sectionId: options.sectionId } : {}),
    source: "commerce-workspace",
    type: "commerce-route-intent",
  };
}

export const commercePackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-commerce",
  status: "ready",
} as const;

export type CommercePackageMeta = typeof commercePackageMeta;
