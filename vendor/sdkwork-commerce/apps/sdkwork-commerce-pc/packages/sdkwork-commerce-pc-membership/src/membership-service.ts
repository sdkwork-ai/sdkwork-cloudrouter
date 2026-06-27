import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  toNullableSdkworkCommerceNumber,
  toSdkworkCommerceMutationStatus,
  toSdkworkCommerceNumber,
  toSdkworkCommerceOptionalString,
  unwrapSdkworkCommerceResponse,
  readSdkworkMediaResource,
  type SdkworkCommerceService,
  type SdkworkMediaResource,
} from "@sdkwork/commerce-service";
import {
  createSdkworkMembershipMessages,
  type SdkworkMembershipMessages,
  type SdkworkMembershipMessagesOverrides,
} from "./membership-copy";

export interface SdkworkMembershipBenefit {
  benefitKey?: string;
  claimed: boolean;
  description?: string;
  id: string;
  name: string;
  type?: string;
  usageLimit: number | null;
  usedCount: number | null;
}

export interface SdkworkMembershipLevel {
  badge?: string;
  description?: string;
  icon?: SdkworkMediaResource;
  id: string;
  isCurrent: boolean;
  levelValue: number;
  name: string;
  requiredPoints: number | null;
}

export interface SdkworkMembershipPlan {
  description?: string;
  durationDays: number | null;
  id: string;
  includedPoints: number;
  levelName?: string;
  name: string;
  originalPriceCny: number | null;
  packageId: number;
  priceCny: number;
  recommended: boolean;
  tags: string[];
}

export interface SdkworkMembershipSummary {
  currentLevelName: string;
  currentLevelValue: number | null;
  expireTime?: string;
  growthValue: number | null;
  isAuthenticated: boolean;
  isMember: boolean;
  pointBalance: number | null;
  points: number | null;
  remainingDays: number | null;
  status: "active" | "free" | "guest";
  totalSpent: number | null;
  upgradeGrowthValue: number | null;
}

export interface SdkworkMembershipDashboardData {
  benefits: SdkworkMembershipBenefit[];
  levels: SdkworkMembershipLevel[];
  plans: SdkworkMembershipPlan[];
  summary: SdkworkMembershipSummary;
}

export interface SdkworkMembershipMutationInput {
  couponId?: string;
  packageId: number;
  paymentMethod?: string;
}

export interface SdkworkMembershipPurchaseResult {
  amountCny: number | null;
  durationDays: number | null;
  orderId?: string;
  packageId: number | null;
  packageName?: string;
  status: "completed" | "failed" | "pending";
  targetLevelName?: string;
}

export interface CreateSdkworkMembershipServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkMembershipMessagesOverrides;
}

export interface SdkworkMembershipService {
  getDashboard(): Promise<SdkworkMembershipDashboardData>;
  getEmptyDashboard(): SdkworkMembershipDashboardData;
  purchaseMembership(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseResult>;
  renewMembership(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseResult>;
  upgradeMembership(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseResult>;
}

interface RemoteMembershipBenefit {
  benefitKey?: string;
  claimed?: boolean;
  description?: string;
  id?: number | string;
  name?: string;
  type?: string;
  usageLimit?: number | string;
  usedCount?: number | string;
}

interface RemoteMembershipLevel {
  badge?: string;
  description?: string;
  icon?: unknown;
  id?: number | string;
  levelValue?: number | string;
  name?: string;
  requiredPoints?: number | string;
}

interface RemoteMembershipInfo {
  expireTime?: string;
  growthValue?: number | string;
  membershipStatus?: string;
  planName?: string;
  planRank?: number | string;
  points?: number | string;
  remainingDays?: number | string;
  totalSpent?: number | string;
  upgradeGrowthValue?: number | string;
}

interface RemoteMembershipStatus {
  active?: boolean;
  expireTime?: string;
  pointBalance?: number | string;
  planRank?: number | string;
}

interface RemoteMembershipPackage {
  description?: string;
  id?: number | string;
  levelName?: string;
  name?: string;
  originalPrice?: number | string;
  pointAmount?: number | string;
  price?: number | string;
  recommended?: boolean;
  sortWeight?: number | string;
  tags?: string[];
  durationDays?: number | string;
}

interface RemoteMembershipPurchaseResult {
  amount?: number | string;
  durationDays?: number | string;
  orderId?: string;
  packageId?: number | string;
  packageName?: string;
  status?: string;
  targetLevelName?: string;
}

function mapPlan(membershipPackage: RemoteMembershipPackage): SdkworkMembershipPlan {
  const packageId = toSdkworkCommerceNumber(membershipPackage.id);

  return {
    description: toSdkworkCommerceOptionalString(membershipPackage.description),
    durationDays: toNullableSdkworkCommerceNumber(membershipPackage.durationDays),
    id: `membership-package-${packageId}`,
    includedPoints: toSdkworkCommerceNumber(membershipPackage.pointAmount),
    levelName: toSdkworkCommerceOptionalString(membershipPackage.levelName),
    name: toSdkworkCommerceOptionalString(membershipPackage.name) || "Membership package",
    originalPriceCny: toNullableSdkworkCommerceNumber(membershipPackage.originalPrice),
    packageId,
    priceCny: toSdkworkCommerceNumber(membershipPackage.price),
    recommended: Boolean(membershipPackage.recommended),
    tags: Array.isArray(membershipPackage.tags)
      ? membershipPackage.tags.map((tag) => tag.trim()).filter(Boolean)
      : [],
  };
}

function sortPlans(plans: SdkworkMembershipPlan[]): SdkworkMembershipPlan[] {
  return [...plans].sort(
    (left, right) =>
      Number(right.recommended) - Number(left.recommended)
      || right.includedPoints - left.includedPoints
      || left.priceCny - right.priceCny
      || left.id.localeCompare(right.id),
  );
}

function sortBenefits(benefits: SdkworkMembershipBenefit[]): SdkworkMembershipBenefit[] {
  return [...benefits].sort(
    (left, right) =>
      Number(right.claimed) - Number(left.claimed)
      || left.name.localeCompare(right.name),
  );
}

function sortLevels(levels: SdkworkMembershipLevel[]): SdkworkMembershipLevel[] {
  return [...levels].sort(
    (left, right) => left.levelValue - right.levelValue || left.name.localeCompare(right.name),
  );
}

function mapSummary(
  membershipInfo: RemoteMembershipInfo | null | undefined,
  membershipStatus: RemoteMembershipStatus | null | undefined,
): SdkworkMembershipSummary {
  const isMember = Boolean(membershipStatus?.active || (membershipInfo?.membershipStatus || "").toUpperCase() === "ACTIVE");
  const currentLevelValue = toNullableSdkworkCommerceNumber(membershipStatus?.planRank ?? membershipInfo?.planRank);

  return {
    currentLevelName: toSdkworkCommerceOptionalString(membershipInfo?.planName) || (isMember ? "Member" : "Free"),
    currentLevelValue,
    expireTime: toSdkworkCommerceOptionalString(membershipStatus?.expireTime) || toSdkworkCommerceOptionalString(membershipInfo?.expireTime),
    growthValue: toNullableSdkworkCommerceNumber(membershipInfo?.growthValue),
    isAuthenticated: true,
    isMember,
    pointBalance: toNullableSdkworkCommerceNumber(membershipStatus?.pointBalance),
    points: toNullableSdkworkCommerceNumber(membershipInfo?.points),
    remainingDays: toNullableSdkworkCommerceNumber(membershipInfo?.remainingDays),
    status: isMember ? "active" : "free",
    totalSpent: toNullableSdkworkCommerceNumber(membershipInfo?.totalSpent),
    upgradeGrowthValue: toNullableSdkworkCommerceNumber(membershipInfo?.upgradeGrowthValue),
  };
}

function mapLevels(
  levels: RemoteMembershipLevel[],
  currentLevelValue: number | null,
): SdkworkMembershipLevel[] {
  return sortLevels(levels.map((level) => ({
    badge: toSdkworkCommerceOptionalString(level.badge),
    description: toSdkworkCommerceOptionalString(level.description),
    icon: readSdkworkMediaResource(level.icon),
    id: `membership-level-${toSdkworkCommerceNumber(level.id)}`,
    isCurrent: currentLevelValue !== null && toSdkworkCommerceNumber(level.levelValue) === currentLevelValue,
    levelValue: toSdkworkCommerceNumber(level.levelValue),
    name: toSdkworkCommerceOptionalString(level.name) || "Membership level",
    requiredPoints: toNullableSdkworkCommerceNumber(level.requiredPoints),
  })));
}

function mapBenefits(benefits: RemoteMembershipBenefit[]): SdkworkMembershipBenefit[] {
  return sortBenefits(benefits.map((benefit) => ({
    benefitKey: toSdkworkCommerceOptionalString(benefit.benefitKey),
    claimed: Boolean(benefit.claimed),
    description: toSdkworkCommerceOptionalString(benefit.description),
    id: `membership-benefit-${toSdkworkCommerceNumber(benefit.id)}`,
    name: toSdkworkCommerceOptionalString(benefit.name) || "Membership benefit",
    type: toSdkworkCommerceOptionalString(benefit.type),
    usageLimit: toNullableSdkworkCommerceNumber(benefit.usageLimit),
    usedCount: toNullableSdkworkCommerceNumber(benefit.usedCount),
  })));
}

function mapPurchaseResult(result: RemoteMembershipPurchaseResult | null | undefined): SdkworkMembershipPurchaseResult {
  return {
    amountCny: toNullableSdkworkCommerceNumber(result?.amount),
    durationDays: toNullableSdkworkCommerceNumber(result?.durationDays),
    orderId: toSdkworkCommerceOptionalString(result?.orderId),
    packageId: toNullableSdkworkCommerceNumber(result?.packageId),
    packageName: toSdkworkCommerceOptionalString(result?.packageName),
    status: toSdkworkCommerceMutationStatus(toSdkworkCommerceOptionalString(result?.status)),
    targetLevelName: toSdkworkCommerceOptionalString(result?.targetLevelName),
  };
}

async function runPurchaseMutation(
  getCommerceService: () => SdkworkCommerceService,
  copy: SdkworkMembershipMessages["service"],
  action: "purchase" | "renew" | "upgrade",
  input: SdkworkMembershipMutationInput,
): Promise<SdkworkMembershipPurchaseResult> {
  requireSdkworkCommerceSession(copy.signInRequired);
  const commerceService = getCommerceService();
  const body = {
    couponId: toSdkworkCommerceOptionalString(input.couponId),
    packageId: input.packageId,
    paymentMethod: toSdkworkCommerceOptionalString(input.paymentMethod),
  };
  const result = unwrapSdkworkCommerceResponse<RemoteMembershipPurchaseResult>(
    await (
      action === "purchase"
        ? commerceService.memberships.purchases.create(body)
        : action === "renew"
          ? commerceService.memberships.purchases.renew(body)
          : commerceService.memberships.purchases.upgrade(body)
    ),
    action === "purchase"
      ? copy.purchaseFailed
      : action === "renew"
        ? copy.renewFailed
        : copy.upgradeFailed,
  );

  return mapPurchaseResult(result);
}

function createEmptyDashboard(): SdkworkMembershipDashboardData {
  return {
    benefits: [],
    levels: [],
    plans: [],
    summary: {
      currentLevelName: "Guest",
      currentLevelValue: null,
      growthValue: null,
      isAuthenticated: false,
      isMember: false,
      pointBalance: null,
      points: null,
      remainingDays: null,
      status: "guest",
      totalSpent: null,
      upgradeGrowthValue: null,
    },
  };
}

export function createSdkworkMembershipService(
  options: CreateSdkworkMembershipServiceOptions = {},
): SdkworkMembershipService {
  const copy = createSdkworkMembershipMessages(options.locale, options.messages);
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();

  return {
    async getDashboard() {
      const commerceService = getCommerceService();

      if (!hasSdkworkCommerceSession()) {
        const packagesPayload = await commerceService.memberships.packages.list();
        const packages = unwrapSdkworkCommerceResponse<RemoteMembershipPackage[]>(packagesPayload);

        return {
          ...createEmptyDashboard(),
          plans: sortPlans(packages.map(mapPlan)),
        };
      }

      const [membershipInfoPayload, membershipStatusPayload, levelsPayload, benefitsPayload, packagesPayload] = await Promise.all([
        commerceService.memberships.current.retrieve(),
        commerceService.memberships.current.status.retrieve(),
        commerceService.memberships.plans.list(),
        commerceService.memberships.benefits.list(),
        commerceService.memberships.packages.list(),
      ]);
      const membershipInfo = unwrapSdkworkCommerceResponse<RemoteMembershipInfo | null>(membershipInfoPayload);
      const membershipStatus = unwrapSdkworkCommerceResponse<RemoteMembershipStatus | null>(membershipStatusPayload);
      const levels = unwrapSdkworkCommerceResponse<RemoteMembershipLevel[]>(levelsPayload);
      const benefits = unwrapSdkworkCommerceResponse<RemoteMembershipBenefit[]>(benefitsPayload);
      const packages = unwrapSdkworkCommerceResponse<RemoteMembershipPackage[]>(packagesPayload);
      const summary = mapSummary(membershipInfo, membershipStatus);

      return {
        benefits: mapBenefits(benefits),
        levels: mapLevels(levels, summary.currentLevelValue),
        plans: sortPlans(packages.map(mapPlan)),
        summary,
      };
    },

    getEmptyDashboard() {
      return createEmptyDashboard();
    },

    async purchaseMembership(input) {
      return runPurchaseMutation(getCommerceService, copy.service, "purchase", input);
    },

    async renewMembership(input) {
      return runPurchaseMutation(getCommerceService, copy.service, "renew", input);
    },

    async upgradeMembership(input) {
      return runPurchaseMutation(getCommerceService, copy.service, "upgrade", input);
    },
  };
}

export const sdkworkMembershipService = createSdkworkMembershipService();
