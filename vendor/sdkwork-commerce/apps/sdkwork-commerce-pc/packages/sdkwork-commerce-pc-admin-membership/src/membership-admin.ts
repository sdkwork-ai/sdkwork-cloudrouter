import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";

export type SdkworkMembershipAdminView = "levels" | "packages" | "memberships" | "entitlements";

export interface SdkworkMembershipAdminWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "membership-admin";
  routePath: string;
}

export interface CreateSdkworkMembershipAdminWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export interface SdkworkMembershipAdminRouteIntent {
  focusWindow: boolean;
  route: string;
  source: "membership-admin-workspace";
  type: "membership-admin-route-intent";
  view?: SdkworkMembershipAdminView;
}

export interface CreateSdkworkMembershipAdminRouteIntentOptions {
  basePath?: string;
  focusWindow?: boolean;
  view?: SdkworkMembershipAdminView;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/admin/memberships").trim();
  if (!normalized || normalized === "/") {
    return "/admin/memberships";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function createSdkworkMembershipAdminWorkspaceManifest({
  description = "Admin membership management workspace for levels, packages, subscriptions, and entitlement review.",
  host,
  id = "sdkwork-membership-admin",
  packageNames = ["@sdkwork/commerce-pc-admin-membership"],
  routePath = "/admin/memberships",
  theme,
  title = "Membership Admin",
}: CreateSdkworkMembershipAdminWorkspaceManifestOptions = {}): SdkworkMembershipAdminWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "membership-admin",
    routePath: normalizeBasePath(routePath),
  };
}

export function createSdkworkMembershipAdminRouteIntent(
  options: CreateSdkworkMembershipAdminRouteIntentOptions = {},
): SdkworkMembershipAdminRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.view) {
    queryParams.set("view", options.view);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    route: `${basePath}${querySuffix}`,
    source: "membership-admin-workspace",
    type: "membership-admin-route-intent",
    ...(options.view ? { view: options.view } : {}),
  };
}

export const membershipAdminPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-admin-membership",
  status: "ready",
} as const;

export type MembershipAdminPackageMeta = typeof membershipAdminPackageMeta;
