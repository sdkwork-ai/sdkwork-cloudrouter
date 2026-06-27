import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";
import type { SdkworkMembershipPlan, SdkworkMembershipSummary } from "@sdkwork/commerce-pc-membership";

export interface SdkworkMembershipPurchaseWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "membership-purchase";
  routePath: string;
}

export interface CreateMembershipPurchaseWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  routePath?: string;
}

export type SdkworkMembershipPurchaseMode = "purchase" | "renew" | "upgrade";

export interface SdkworkMembershipPurchaseRouteIntent {
  focusWindow: boolean;
  mode?: SdkworkMembershipPurchaseMode;
  packageId?: number;
  route: string;
  source: "membership-purchase-workspace";
  type: "membership-purchase-route-intent";
}

export interface CreateMembershipPurchaseRouteIntentOptions {
  basePath?: string;
  focusWindow?: boolean;
  mode?: SdkworkMembershipPurchaseMode;
  packageId?: number;
}

export interface ResolveMembershipPurchaseActionOptions {
  plan?: Pick<SdkworkMembershipPlan, "durationDays" | "packageId"> | null;
  summary: Pick<SdkworkMembershipSummary, "isMember" | "remainingDays">;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/memberships/purchase").trim();
  if (!normalized || normalized === "/") {
    return "/memberships/purchase";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

export function resolveSdkworkMembershipPurchaseMode({
  plan,
  summary,
}: ResolveMembershipPurchaseActionOptions): SdkworkMembershipPurchaseMode {
  if (!summary.isMember) {
    return "purchase";
  }

  const remainingDays = summary.remainingDays ?? Number.POSITIVE_INFINITY;
  const durationDays = plan?.durationDays ?? 0;

  return remainingDays <= Math.max(30, Math.ceil(durationDays * 0.2)) ? "renew" : "upgrade";
}

export function createMembershipPurchaseWorkspaceManifest({
  description = "Membership purchase workspace for top-header package purchase, renewal, and upgrade entry points.",
  host,
  id = "sdkwork-membership-purchase",
  packageNames = ["@sdkwork/commerce-pc-membership-purchase", "@sdkwork/commerce-pc-membership"],
  routePath = "/memberships/purchase",
  theme,
  title = "Membership Purchase",
}: CreateMembershipPurchaseWorkspaceManifestOptions = {}): SdkworkMembershipPurchaseWorkspaceManifest {
  return {
    ...createSdkworkAppCapabilityManifest({
      description,
      host,
      id,
      packageNames,
      theme,
      title,
    }),
    capability: "membership-purchase",
    routePath: normalizeBasePath(routePath),
  };
}

export function createMembershipPurchaseRouteIntent(
  options: CreateMembershipPurchaseRouteIntentOptions = {},
): SdkworkMembershipPurchaseRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.mode) {
    queryParams.set("mode", options.mode);
  }

  if (typeof options.packageId === "number" && Number.isFinite(options.packageId)) {
    queryParams.set("packageId", String(options.packageId));
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    ...(options.mode ? { mode: options.mode } : {}),
    ...(typeof options.packageId === "number" && Number.isFinite(options.packageId)
      ? { packageId: options.packageId }
      : {}),
    route: `${basePath}${querySuffix}`,
    source: "membership-purchase-workspace",
    type: "membership-purchase-route-intent",
  };
}

export const membershipPurchasePackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-membership-purchase",
  status: "ready",
} as const;

export type MembershipPurchasePackageMeta = typeof membershipPurchasePackageMeta;
