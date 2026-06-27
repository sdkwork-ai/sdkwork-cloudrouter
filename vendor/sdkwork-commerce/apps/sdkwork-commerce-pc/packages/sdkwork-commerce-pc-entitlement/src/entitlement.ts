import {
  createSdkworkEntitlementMessages,
  type SdkworkEntitlementMessagesOverrides,
} from "./entitlement-copy";

export interface SdkworkAppCapabilityManifest {
  description?: string;
  host?: string;
  id: string;
  packageNames: string[];
  theme?: string;
  title: string;
}

export interface CreateSdkworkAppCapabilityManifestOptions {
  description?: string;
  host?: string;
  id?: string;
  packageNames?: string[];
  theme?: string;
  title?: string;
}

function createSdkworkAppCapabilityManifest(
  options: CreateSdkworkAppCapabilityManifestOptions = {},
): SdkworkAppCapabilityManifest {
  return {
    ...(options.description ? { description: options.description } : {}),
    ...(options.host ? { host: options.host } : {}),
    id: options.id ?? "sdkwork-capability",
    packageNames: [...(options.packageNames ?? [])],
    ...(options.theme ? { theme: options.theme } : {}),
    title: options.title ?? "Capability",
  };
}

export type SdkworkEntitlementStatus =
  | "ready"
  | "limited"
  | "locked"
  | "upgrade-required"
  | "recharge-required";

export type SdkworkEntitlementFilter = "all" | "attention" | SdkworkEntitlementStatus;

export type SdkworkEntitlementReasonCode =
  | "authentication-required"
  | "insufficient-points"
  | "minimum-level"
  | "quota-exhausted"
  | "quota-near-limit";

export type SdkworkEntitlementActionCapability = Extract<
  SdkworkCommercialActionCapability,
  "offer" | "points" | "subscription"
>;
export type SdkworkEntitlementActionIntent = "recharge" | "review" | "upgrade";
export type SdkworkEntitlementAction = SdkworkCommercialAction<
  SdkworkEntitlementActionCapability,
  SdkworkEntitlementActionIntent
>;

export type SdkworkCommercialActionCapability = "offer" | "points" | "subscription";

export interface SdkworkCommercialAction<
  TCapability extends SdkworkCommercialActionCapability,
  TIntent extends string,
> {
  capability: TCapability;
  intent: TIntent;
  label: string;
  route: string;
}

export interface SdkworkEntitlementDescriptor {
  category: string;
  description?: string;
  id: string;
  minimumLevelValue?: number | null;
  minimumPointsBalance?: number | null;
  quotaLimit?: number | null;
  quotaUsed?: number | null;
  tags?: string[];
  title: string;
  warningThreshold?: number | null;
}

export interface SdkworkEntitlementEvaluationContext {
  availablePoints: number;
  currentLevelValue: number | null;
  isAuthenticated: boolean;
}

export interface SdkworkEntitlementDecision extends SdkworkEntitlementDescriptor {
  isAvailable: boolean;
  isNearLimit: boolean;
  reasonCodes: SdkworkEntitlementReasonCode[];
  recommendedAction: SdkworkEntitlementAction | null;
  remainingQuota: number | null;
  status: SdkworkEntitlementStatus;
  usageRatio: number | null;
}

export interface SdkworkEntitlementDigest {
  attentionCapabilities: number;
  limitedCapabilities: number;
  lockedCapabilities: number;
  readyCapabilities: number;
  rechargeRequiredCapabilities: number;
  totalCapabilities: number;
  upgradeRequiredCapabilities: number;
}

export interface SdkworkEntitlementInventorySummary {
  availablePoints: number;
  currentLevelName: string;
  currentLevelValue: number | null;
  featuredOfferCount: number;
  isAuthenticated: boolean;
  subscriptionPlanCount: number;
  membershipRemainingDays: number | null;
}

export interface SdkworkEntitlementDashboardData {
  decisions: SdkworkEntitlementDecision[];
  digest: SdkworkEntitlementDigest;
  inventory: SdkworkEntitlementInventorySummary;
  topAction: SdkworkEntitlementAction | null;
}

export interface SdkworkEntitlementWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "entitlement";
  routePath: string;
}

export interface CreateEntitlementWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
  routePath?: string;
}

export interface CreateEmptySdkworkEntitlementDashboardOptions {
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
}

export interface CreateSdkworkEntitlementEvaluationOptions {
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
}

export interface SdkworkEntitlementRouteIntent {
  capabilityId?: string;
  filter?: SdkworkEntitlementFilter;
  focusWindow: boolean;
  route: string;
  source: "entitlement-workspace";
  type: "entitlement-route-intent";
}

export interface CreateEntitlementRouteIntentOptions {
  basePath?: string;
  capabilityId?: string;
  filter?: SdkworkEntitlementFilter;
  focusWindow?: boolean;
}

const DEFAULT_WARNING_THRESHOLD = 0.85;

const CATEGORY_ORDER: Record<string, number> = {
  assistant: 0,
  generation: 1,
  collaboration: 2,
  automation: 3,
  workspace: 4,
};

const STATUS_PRIORITY: Record<SdkworkEntitlementStatus, number> = {
  locked: 4,
  "upgrade-required": 3,
  "recharge-required": 2,
  limited: 1,
  ready: 0,
};

export const SDKWORK_ENTITLEMENT_STATUS_LABELS: Record<SdkworkEntitlementStatus, string> = {
  limited: "Near limit",
  locked: "Sign in required",
  ready: "Ready",
  "recharge-required": "Recharge required",
  "upgrade-required": "Upgrade required",
};

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/entitlements").trim();
  if (!normalized || normalized === "/") {
    return "/entitlements";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeWarningThreshold(value: number | null | undefined): number {
  const resolved = toFiniteNumber(value);
  if (resolved === null) {
    return DEFAULT_WARNING_THRESHOLD;
  }

  if (resolved > 1) {
    return Math.min(1, Math.max(0, resolved / 100));
  }

  return Math.min(1, Math.max(0, resolved));
}

function createSdkworkCommercialAction<
  TCapability extends SdkworkCommercialActionCapability,
  TIntent extends string,
>(action: SdkworkCommercialAction<TCapability, TIntent>): SdkworkCommercialAction<TCapability, TIntent> {
  return action;
}

function createOfferRouteIntent(
  options: { group?: string } = {},
): { route: string } {
  const query = new URLSearchParams();
  if (options.group) {
    query.set("group", options.group);
  }

  const suffix = query.toString();
  return {
    route: `/offers${suffix ? `?${suffix}` : ""}`,
  };
}

function createPointsRouteIntent(
  options: { sectionId?: string } = {},
): { route: string } {
  const query = new URLSearchParams();
  if (options.sectionId) {
    query.set("section", options.sectionId);
  }

  const suffix = query.toString();
  return {
    route: `/points${suffix ? `?${suffix}` : ""}`,
  };
}

function createSubscriptionRouteIntent(
  options: { mode?: string } = {},
): { route: string } {
  const query = new URLSearchParams();
  if (options.mode) {
    query.set("mode", options.mode);
  }

  const suffix = query.toString();
  return {
    route: `/subscription${suffix ? `?${suffix}` : ""}`,
  };
}

function createUpgradeAction(
  copy: ReturnType<typeof createSdkworkEntitlementMessages>,
): SdkworkEntitlementAction {
  return createSdkworkCommercialAction({
    capability: "subscription",
    intent: "upgrade",
    label: copy.service.actionOpenUpgrade,
    route: createSubscriptionRouteIntent({
      mode: "upgrade",
    }).route,
  });
}

function createRechargeAction(
  copy: ReturnType<typeof createSdkworkEntitlementMessages>,
): SdkworkEntitlementAction {
  return createSdkworkCommercialAction({
    capability: "points",
    intent: "recharge",
    label: copy.service.actionOpenRecharge,
    route: createPointsRouteIntent({
      sectionId: "recharge",
    }).route,
  });
}

function createOfferMembershipAction(
  copy: ReturnType<typeof createSdkworkEntitlementMessages>,
  label = copy.service.actionReviewUpgradeOptions,
): SdkworkEntitlementAction {
  return createSdkworkCommercialAction({
    capability: "offer",
    intent: "review",
    label,
    route: createOfferRouteIntent({
      group: "membership",
    }).route,
  });
}

function normalizeDescriptor(descriptor: SdkworkEntitlementDescriptor): SdkworkEntitlementDescriptor {
  return {
    ...descriptor,
    category: descriptor.category.trim() || "workspace",
    description: descriptor.description?.trim() || undefined,
    id: descriptor.id.trim(),
    minimumLevelValue: toFiniteNumber(descriptor.minimumLevelValue),
    minimumPointsBalance: toFiniteNumber(descriptor.minimumPointsBalance),
    quotaLimit: toFiniteNumber(descriptor.quotaLimit),
    quotaUsed: toFiniteNumber(descriptor.quotaUsed),
    tags: [...new Set((descriptor.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
    title: descriptor.title.trim(),
    warningThreshold: toFiniteNumber(descriptor.warningThreshold),
  };
}

export function formatSdkworkEntitlementStatus(status: SdkworkEntitlementStatus): string {
  return SDKWORK_ENTITLEMENT_STATUS_LABELS[status];
}

export function createSdkworkEntitlementCatalog(
  descriptors: readonly SdkworkEntitlementDescriptor[],
): SdkworkEntitlementDescriptor[] {
  return descriptors
    .map(normalizeDescriptor)
    .sort(
      (left, right) =>
        (CATEGORY_ORDER[left.category] ?? Number.MAX_SAFE_INTEGER) -
          (CATEGORY_ORDER[right.category] ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id),
    );
}

export function createSdkworkStarterEntitlementCatalog(): SdkworkEntitlementDescriptor[] {
  return [
    {
      category: "assistant",
      description: "Baseline assistant sessions, drafts, and core desktop copilots.",
      id: "smart-chat",
      tags: ["Core"],
      title: "Smart Chat",
    },
    {
      category: "assistant",
      description: "Premium reasoning, coding, and research-grade model selection.",
      id: "premium-models",
      minimumLevelValue: 3,
      tags: ["Premium"],
      title: "Premium Models",
    },
    {
      category: "generation",
      description: "High-throughput rendering and rich media generation workflows.",
      id: "batch-render",
      minimumPointsBalance: 5000,
      tags: ["Render"],
      title: "Batch Render",
    },
    {
      category: "collaboration",
      description: "Realtime voice rooms and premium collaboration spaces.",
      id: "realtime-room",
      quotaLimit: 100,
      quotaUsed: 0,
      tags: ["RTC"],
      title: "Realtime Room",
      warningThreshold: 0.9,
    },
    {
      category: "automation",
      description: "Agentic automation runs, scheduled workflows, and background orchestration.",
      id: "agent-automation",
      quotaLimit: 50,
      quotaUsed: 0,
      tags: ["Agents"],
      title: "Agent Automation",
      warningThreshold: 0.8,
    },
    {
      category: "workspace",
      description: "Expanded storage and project retention for premium workspaces.",
      id: "cloud-storage",
      minimumLevelValue: 2,
      quotaLimit: 500,
      quotaUsed: 0,
      tags: ["Storage"],
      title: "Cloud Storage",
      warningThreshold: 0.85,
    },
  ].map(normalizeDescriptor);
}

export function evaluateSdkworkEntitlementDecision(
  descriptor: SdkworkEntitlementDescriptor,
  context: SdkworkEntitlementEvaluationContext,
  options: CreateSdkworkEntitlementEvaluationOptions = {},
): SdkworkEntitlementDecision {
  const copy = createSdkworkEntitlementMessages(options.locale, options.messages);
  const normalizedDescriptor = normalizeDescriptor(descriptor);
  const minimumLevelValue = normalizedDescriptor.minimumLevelValue ?? null;
  const minimumPointsBalance = normalizedDescriptor.minimumPointsBalance ?? null;
  const currentLevelValue = toFiniteNumber(context.currentLevelValue) ?? 0;
  const availablePoints = Math.max(0, toFiniteNumber(context.availablePoints) ?? 0);
  const quotaLimit = normalizedDescriptor.quotaLimit ?? null;
  const quotaUsed = normalizedDescriptor.quotaUsed ?? 0;
  const remainingQuota = quotaLimit === null ? null : Math.max(0, quotaLimit - quotaUsed);
  const usageRatio = quotaLimit && quotaLimit > 0
    ? roundRatio(quotaUsed / quotaLimit)
    : null;

  if (!context.isAuthenticated) {
    return {
      ...normalizedDescriptor,
      isAvailable: false,
      isNearLimit: false,
      reasonCodes: ["authentication-required"],
      recommendedAction: createOfferMembershipAction(copy, copy.service.actionExploreAccessOptions),
      remainingQuota,
      status: "locked",
      usageRatio,
    };
  }

  if (minimumLevelValue !== null && minimumLevelValue > currentLevelValue) {
    return {
      ...normalizedDescriptor,
      isAvailable: false,
      isNearLimit: false,
      reasonCodes: ["minimum-level"],
      recommendedAction: createUpgradeAction(copy),
      remainingQuota,
      status: "upgrade-required",
      usageRatio,
    };
  }

  if (minimumPointsBalance !== null && minimumPointsBalance > availablePoints) {
    return {
      ...normalizedDescriptor,
      isAvailable: false,
      isNearLimit: false,
      reasonCodes: ["insufficient-points"],
      recommendedAction: createRechargeAction(copy),
      remainingQuota,
      status: "recharge-required",
      usageRatio,
    };
  }

  if (quotaLimit !== null && quotaUsed >= quotaLimit) {
    return {
      ...normalizedDescriptor,
      isAvailable: false,
      isNearLimit: false,
      reasonCodes: ["quota-exhausted"],
      recommendedAction: createUpgradeAction(copy),
      remainingQuota,
      status: "upgrade-required",
      usageRatio,
    };
  }

  if (
    quotaLimit !== null &&
    quotaLimit > 0 &&
    usageRatio !== null &&
    usageRatio >= normalizeWarningThreshold(normalizedDescriptor.warningThreshold)
  ) {
    return {
      ...normalizedDescriptor,
      isAvailable: true,
      isNearLimit: true,
      reasonCodes: ["quota-near-limit"],
      recommendedAction: createOfferMembershipAction(copy),
      remainingQuota,
      status: "limited",
      usageRatio,
    };
  }

  return {
    ...normalizedDescriptor,
    isAvailable: true,
    isNearLimit: false,
    reasonCodes: [],
    recommendedAction: null,
    remainingQuota,
    status: "ready",
    usageRatio,
  };
}

export function sortSdkworkEntitlementDecisions(
  decisions: readonly SdkworkEntitlementDecision[],
): SdkworkEntitlementDecision[] {
  return [...decisions].sort(
    (left, right) =>
      STATUS_PRIORITY[right.status] - STATUS_PRIORITY[left.status] ||
      Number(right.isNearLimit) - Number(left.isNearLimit) ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

export function summarizeSdkworkEntitlementDecisions(
  decisions: readonly SdkworkEntitlementDecision[],
): SdkworkEntitlementDigest {
  return decisions.reduce<SdkworkEntitlementDigest>(
    (summary, decision) => {
      summary.totalCapabilities += 1;

      if (decision.status === "ready") {
        summary.readyCapabilities += 1;
      } else {
        summary.attentionCapabilities += 1;
      }

      if (decision.status === "limited") {
        summary.limitedCapabilities += 1;
      } else if (decision.status === "locked") {
        summary.lockedCapabilities += 1;
      } else if (decision.status === "upgrade-required") {
        summary.upgradeRequiredCapabilities += 1;
      } else if (decision.status === "recharge-required") {
        summary.rechargeRequiredCapabilities += 1;
      }

      return summary;
    },
    {
      attentionCapabilities: 0,
      limitedCapabilities: 0,
      lockedCapabilities: 0,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 0,
      totalCapabilities: 0,
      upgradeRequiredCapabilities: 0,
    },
  );
}

export function selectTopSdkworkEntitlementAction(
  decisions: readonly SdkworkEntitlementDecision[],
): SdkworkEntitlementAction | null {
  return sortSdkworkEntitlementDecisions(decisions)
    .find((decision) => decision.recommendedAction)?.recommendedAction ?? null;
}

export function createEmptySdkworkEntitlementDashboard(
  options: CreateEmptySdkworkEntitlementDashboardOptions = {},
): SdkworkEntitlementDashboardData {
  const copy = createSdkworkEntitlementMessages(options.locale, options.messages);

  return {
    decisions: [],
    digest: {
      attentionCapabilities: 0,
      limitedCapabilities: 0,
      lockedCapabilities: 0,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 0,
      totalCapabilities: 0,
      upgradeRequiredCapabilities: 0,
    },
    inventory: {
      availablePoints: 0,
      currentLevelName: copy.service.guestLabel,
      currentLevelValue: null,
      featuredOfferCount: 0,
      isAuthenticated: false,
      subscriptionPlanCount: 0,
      membershipRemainingDays: null,
    },
    topAction: null,
  };
}

export function createEntitlementWorkspaceManifest({
  description,
  host,
  id = "sdkwork-entitlement",
  locale,
  messages,
  packageNames = [
    "@sdkwork/commerce-pc-entitlement",
    "@sdkwork/commerce-pc-offer",
    "@sdkwork/commerce-pc-points",
    "@sdkwork/commerce-pc-subscription",
    "@sdkwork/commerce-pc-membership",
    "@sdkwork/commerce-pc-wallet",
  ],
  routePath = "/entitlements",
  theme,
  title,
}: CreateEntitlementWorkspaceManifestOptions = {}): SdkworkEntitlementWorkspaceManifest {
  const copy = createSdkworkEntitlementMessages(locale, messages).manifest;

  return {
    ...createSdkworkAppCapabilityManifest({
      description: description ?? copy.description,
      host,
      id,
      packageNames,
      theme,
      title: title ?? copy.title,
    }),
    capability: "entitlement",
    routePath: normalizeBasePath(routePath),
  };
}

export function createEntitlementRouteIntent(
  options: CreateEntitlementRouteIntentOptions = {},
): SdkworkEntitlementRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.filter) {
    queryParams.set("filter", options.filter);
  }

  if (options.capabilityId) {
    queryParams.set("capabilityId", options.capabilityId);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    ...(options.capabilityId ? { capabilityId: options.capabilityId } : {}),
    ...(options.filter ? { filter: options.filter } : {}),
    focusWindow: options.focusWindow !== false,
    route: `${basePath}${querySuffix}`,
    source: "entitlement-workspace",
    type: "entitlement-route-intent",
  };
}

export const entitlementPackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-entitlement",
  status: "ready",
} as const;

export type EntitlementPackageMeta = typeof entitlementPackageMeta;
