import type { CloudRouterH5CommerceServices } from '@sdkwork/cloudrouter-h5-core/sdk';
import {
  getCloudRouterH5CommerceServices,
  hasCloudRouterCommerceSession,
  toSdkworkAccountPointsFromMicro,
  unwrapSdkworkAccountResource,
  unwrapSdkworkMembershipPageItems,
  unwrapSdkworkMembershipResponse,
} from '@sdkwork/cloudrouter-h5-core/sdk';import {
  toNullableSdkworkMembershipNumber,
  toSdkworkMembershipOptionalString,
} from '@sdkwork/membership-service';

import type {
  RemoteMembershipBenefit,
  RemoteMembershipPackageGroup,
  RemoteMembershipPlan,
} from './catalog/membershipDefinition.js';

/**
 * Host-injected data plane for the Cloud Router H5 membership surfaces.
 *
 * The screens never call a transport directly: the runtime owns the catalog,
 * member status, Token Bank balance, checkout, recharge, and redemption calls.
 * The default runtime (`createCloudRouterMembershipRuntime`) binds the H5
 * commerce services; tests and alternate hosts can inject their own.
 */
export interface MembershipCatalogSnapshot {
  readonly benefitsByRank: Readonly<Record<number, readonly RemoteMembershipBenefit[]>>;
  readonly groups: readonly RemoteMembershipPackageGroup[];
  readonly plans: readonly RemoteMembershipPlan[];
}

export interface MembershipMemberProfile {
  readonly active: boolean;
  readonly expiresAt?: string;
  /** Served level name, when the backend provides one. */
  readonly levelName?: string;
  readonly planRank: number | null;
  readonly remainingDays: number | null;
}

export interface MembershipRechargePackage {
  readonly bonusPoints: number;
  readonly currencyCode: string;
  readonly id: string;
  /** Package price in major currency units (render with a currency formatter). */
  readonly priceAmount: number;
  /** Credited compute credits in whole points (converted from the wire micro unit). */
  readonly points: number;
}

export type MembershipPaymentMethod = 'alipay' | 'wechat_pay';

export interface MembershipOrderInput {
  readonly packageId: number;
  readonly paymentMethod: MembershipPaymentMethod;
  readonly targetPlanRank: number;
}

export interface MembershipRechargeOrderInput {
  readonly packageId: string;
  readonly paymentMethod: MembershipPaymentMethod;
}

export interface MembershipOrderOutcome {
  readonly amountCny: number | null;
  readonly cashierUrl?: string;
  readonly durationDays?: number | null;
  readonly orderId?: string;
  readonly packageName?: string;
  readonly status: 'completed' | 'failed' | 'pending';
  readonly targetPlanName?: string;
}

export interface MembershipRechargeOutcome {
  readonly amountCny: number | null;
  readonly cashierUrl?: string;
  readonly orderId?: string;
  readonly points: number;
  readonly status: 'completed' | 'failed' | 'pending';
}

export interface MembershipRedeemOutcome {
  readonly benefitKind: 'cash_credit' | 'points_credit' | 'subscription' | 'token_bank_credit';
  readonly grantAmount?: number;
  readonly grantPoints?: number;
  readonly status: 'completed' | 'pending';
}

export interface CloudRouterH5MembershipRuntime {
  /** Creates one membership order and returns the cashier hand-off. */
  createMembershipOrder(input: MembershipOrderInput): Promise<MembershipOrderOutcome>;
  /** Creates one Token Bank compute-credit recharge order. */
  createRechargeOrder(input: MembershipRechargeOrderInput): Promise<MembershipRechargeOutcome>;
  loadCatalog(): Promise<MembershipCatalogSnapshot>;
  loadMemberProfile(): Promise<MembershipMemberProfile | null>;
  loadRechargePackages(): Promise<readonly MembershipRechargePackage[]>;
  /** Spendable Token Bank compute credits, or null when unavailable. */
  loadTokenBankBalance(): Promise<number | null>;
  redeemCode(code: string): Promise<MembershipRedeemOutcome>;
  readonly signedIn: boolean;
}

const CATALOG_PAGE_QUERY = { page: 1, pageSize: 200, category: 'token' as const };
/** Plan ranks whose benefits drive the comparison matrix (0 = free tier). */
const BENEFIT_RANKS = [0, 1, 2, 3, 4] as const;

function normalizeOrderStatus(status: unknown): 'completed' | 'failed' | 'pending' {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'paid' || normalized === 'success') {
    return 'completed';
  }
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled'
    || normalized === 'closed' || normalized === 'expired') {
    return 'failed';
  }
  return 'pending';
}

async function loadBenefitsByRank(
  services: CloudRouterH5CommerceServices,
): Promise<Record<number, RemoteMembershipBenefit[]>> {
  // Benefits are catalog data and publicly readable; a rejected rank (for
  // example an unseeded upper tier) degrades to the static comparison fallbacks
  // instead of failing the whole page.
  const entries = await Promise.all(
    BENEFIT_RANKS.map(async (rank) => {
      try {
        const payload = await services.membership.memberships.benefits.list({
          ...CATALOG_PAGE_QUERY,
          planId: String(rank),
        });
        return [rank, unwrapSdkworkMembershipPageItems<RemoteMembershipBenefit>(payload)] as const;
      } catch {
        return [rank, [] as RemoteMembershipBenefit[]] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

/**
 * Binds the membership runtime to the H5 commerce services.
 *
 * The catalog, member status, and Token Bank reads are the same domain calls the
 * PC `/token-plan` page makes; the checkout and recharge commands use the
 * mobile cashier product (`mobile_cashier_h5`) so a phone buyer is handed to the
 * H5 cashier route instead of a desktop QR code.
 */
export function createCloudRouterMembershipRuntime(
  services: CloudRouterH5CommerceServices,
): CloudRouterH5MembershipRuntime {
  const loadMemberProfile = async (): Promise<MembershipMemberProfile | null> => {
    if (!hasCloudRouterCommerceSession()) {
      return null;
    }

    try {
      const info = unwrapSdkworkMembershipResponse<{
        expiresAt?: string;
        membershipStatus?: string;
        planName?: string;
        planRank?: unknown;
        remainingDays?: unknown;
      } | null>(await services.membership.memberships.current.retrieve());
      if (!info) {
        return null;
      }
      const planRank = toNullableSdkworkMembershipNumber(info.planRank) ?? 0;
      const status = toSdkworkMembershipOptionalString(info.membershipStatus)?.toLowerCase();
      const expired = status === 'expired' || status === 'inactive' || status === 'none';
      const levelName = toSdkworkMembershipOptionalString(info.planName);
      return {
        active: planRank > 0 && !expired,
        ...(toSdkworkMembershipOptionalString(info.expiresAt)
          ? { expiresAt: toSdkworkMembershipOptionalString(info.expiresAt) }
          : {}),
        ...(levelName ? { levelName } : {}),
        planRank: planRank > 0 ? planRank : null,
        remainingDays: toNullableSdkworkMembershipNumber(info.remainingDays),
      };
    } catch {
      // The info projection needs an active subscription; fall back to the
      // status projection, which answers for any signed-in account.
      try {
        const status = unwrapSdkworkMembershipResponse<{
          active?: boolean;
          expiresAt?: string;
          planRank?: unknown;
        } | null>(await services.membership.memberships.current.status.retrieve());
        const planRank = toNullableSdkworkMembershipNumber(status?.planRank) ?? 0;
        const active = Boolean(status?.active) && planRank > 0;
        return {
          active,
          ...(toSdkworkMembershipOptionalString(status?.expiresAt)
            ? { expiresAt: toSdkworkMembershipOptionalString(status?.expiresAt) }
            : {}),
          planRank: planRank > 0 ? planRank : null,
          remainingDays: null,
        };
      } catch {
        return null;
      }
    }
  };

  return {
    async createMembershipOrder(input) {
      const profile = await loadMemberProfile().catch(() => null);
      const currentRank = profile?.active ? profile.planRank ?? 0 : 0;
      const action = currentRank > 0
        ? input.targetPlanRank > currentRank
          ? 'upgrade'
          : 'renew'
        : 'purchase';
      const payment = await services.membershipCheckout.createCheckout({
        action,
        packageId: input.packageId,
        paymentMethod: input.paymentMethod,
        paymentProduct: 'mobile_cashier_h5',
      });
      const cashierUrl = toSdkworkMembershipOptionalString(payment.cashierUrl);
      const orderId = toSdkworkMembershipOptionalString(payment.orderId);
      const packageName = toSdkworkMembershipOptionalString(payment.packageName);
      const targetPlanName = toSdkworkMembershipOptionalString(payment.targetLevelName);
      return {
        amountCny: payment.amountCny,
        ...(cashierUrl ? { cashierUrl } : {}),
        durationDays: payment.durationDays,
        ...(orderId ? { orderId } : {}),
        ...(packageName ? { packageName } : {}),
        status: normalizeOrderStatus(payment.status),
        ...(targetPlanName ? { targetPlanName } : {}),
      };
    },

    async createRechargeOrder(input) {
      const payment = await services.tokenBankRecharge.createOrder({
        packageId: input.packageId,
        paymentMethod: input.paymentMethod,
        paymentProduct: 'mobile_cashier_h5',
        source: 'cloudrouter-h5-membership',
      });
      const cashierUrl = toSdkworkMembershipOptionalString(payment.cashierUrl);
      const orderId = toSdkworkMembershipOptionalString(payment.orderId);
      return {
        amountCny: payment.amountCny,
        ...(cashierUrl ? { cashierUrl } : {}),
        ...(orderId ? { orderId } : {}),
        points: toSdkworkAccountPointsFromMicro(payment.points),
        status: normalizeOrderStatus(payment.status),
      };
    },

    async loadCatalog() {
      const [groupsPayload, plansPayload, benefitsByRank] = await Promise.all([
        services.membership.memberships.packageGroups.list(CATALOG_PAGE_QUERY),
        services.membership.memberships.plans.list(CATALOG_PAGE_QUERY),
        loadBenefitsByRank(services),
      ]);
      return {
        benefitsByRank,
        groups: unwrapSdkworkMembershipPageItems<RemoteMembershipPackageGroup>(groupsPayload),
        plans: unwrapSdkworkMembershipPageItems<RemoteMembershipPlan>(plansPayload),
      };
    },

    loadMemberProfile,

    async loadRechargePackages() {
      const packages = await services.tokenBankRecharge.listPackages();
      // The order catalog serializes credited points as micro-points (1 point =
      // 1e6); every surface must divide once, exactly like the PC recharge
      // dialog does with `sdkworkTokenBankPointsMicroToDecimal`.
      return packages.map((item) => ({
        bonusPoints: toSdkworkAccountPointsFromMicro(item.bonusPoints),
        currencyCode: item.currencyCode,
        id: item.id,
        points: toSdkworkAccountPointsFromMicro(item.points),
        priceAmount: item.priceAmount,
      }));
    },

    async loadTokenBankBalance() {
      if (!hasCloudRouterCommerceSession()) {
        return null;
      }
      try {
        const account = unwrapSdkworkAccountResource<{ availableAmount?: unknown }>(
          await services.account.tokenBank.account.retrieve(),
        );
        return toSdkworkAccountPointsFromMicro(account?.availableAmount);
      } catch {
        return null;
      }
    },

    async redeemCode(code) {
      const result = await services.couponRecharge.redeem(code);
      const status = normalizeOrderStatus(result.status);
      return {
        benefitKind: result.benefitKind,
        ...('grantAmount' in result && typeof result.grantAmount === 'number'
          ? { grantAmount: result.grantAmount }
          : {}),
        ...('grantPoints' in result && typeof result.grantPoints === 'number'
          ? { grantPoints: result.grantPoints }
          : {}),
        status: status === 'failed' ? 'pending' : status,
      };
    },

    get signedIn() {
      return hasCloudRouterCommerceSession();
    },
  };
}

let membershipRuntime: CloudRouterH5MembershipRuntime | null = null;

/** Wires the host membership data plane for the subscription surfaces. */
export function configureCloudRouterH5MembershipRuntime(
  nextRuntime: CloudRouterH5MembershipRuntime | null,
): void {
  membershipRuntime = nextRuntime;
}

/** Returns the injected runtime, or `null` when the host did not compose one. */
export function getCloudRouterH5MembershipRuntime(): CloudRouterH5MembershipRuntime | null {
  return membershipRuntime;
}

/** Bootstrap entry: binds the runtime to the H5 commerce services once. */
export function bootstrapCloudRouterH5Membership(): CloudRouterH5MembershipRuntime {
  const runtime = membershipRuntime ?? createCloudRouterMembershipRuntime(getCloudRouterH5CommerceServices());
  membershipRuntime = runtime;
  return runtime;
}

/** Test seam: restores the unconfigured package state. */
export function resetCloudRouterH5MembershipRuntime(): void {
  membershipRuntime = null;
}
