import type { SdkworkCommerceService } from "@sdkwork/commerce-service";
import {
  createSdkworkMembershipService,
  type SdkworkMembershipMutationInput,
  type SdkworkMembershipPlan,
  type SdkworkMembershipPurchaseResult,
  type SdkworkMembershipService,
  type SdkworkMembershipSummary,
} from "@sdkwork/commerce-pc-membership";
import {
  resolveSdkworkMembershipPurchaseMode,
  type SdkworkMembershipPurchaseMode,
} from "./membership-purchase";

export interface SdkworkMembershipPurchaseSubmitInput extends SdkworkMembershipMutationInput {
  mode?: SdkworkMembershipPurchaseMode;
  plan?: Pick<SdkworkMembershipPlan, "durationDays" | "packageId"> | null;
  summary: Pick<SdkworkMembershipSummary, "isMember" | "remainingDays">;
}

export interface SdkworkMembershipPurchaseSubmitResult extends SdkworkMembershipPurchaseResult {
  mode: SdkworkMembershipPurchaseMode;
}

export interface CreateSdkworkMembershipPurchaseServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  membershipService?: Pick<SdkworkMembershipService, "purchaseMembership" | "renewMembership" | "upgradeMembership">;
}

export interface SdkworkMembershipPurchaseService {
  purchasePackage(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseSubmitResult>;
  renewPackage(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseSubmitResult>;
  submitPackagePurchase(input: SdkworkMembershipPurchaseSubmitInput): Promise<SdkworkMembershipPurchaseSubmitResult>;
  upgradePackage(input: SdkworkMembershipMutationInput): Promise<SdkworkMembershipPurchaseSubmitResult>;
}

function createMembershipPurchasePayload(input: SdkworkMembershipMutationInput): SdkworkMembershipMutationInput {
  return {
    couponId: input.couponId,
    packageId: input.packageId,
    paymentMethod: input.paymentMethod,
  };
}

async function withMode(
  mode: SdkworkMembershipPurchaseMode,
  request: Promise<SdkworkMembershipPurchaseResult>,
): Promise<SdkworkMembershipPurchaseSubmitResult> {
  return {
    ...(await request),
    mode,
  };
}

export function createSdkworkMembershipPurchaseService(
  options: CreateSdkworkMembershipPurchaseServiceOptions = {},
): SdkworkMembershipPurchaseService {
  const membershipService = options.membershipService ?? createSdkworkMembershipService({
    commerceService: options.commerceService,
    locale: options.locale,
  });
  const purchasePackage = (input: SdkworkMembershipMutationInput) =>
    withMode("purchase", membershipService.purchaseMembership(createMembershipPurchasePayload(input)));
  const renewPackage = (input: SdkworkMembershipMutationInput) =>
    withMode("renew", membershipService.renewMembership(createMembershipPurchasePayload(input)));
  const upgradePackage = (input: SdkworkMembershipMutationInput) =>
    withMode("upgrade", membershipService.upgradeMembership(createMembershipPurchasePayload(input)));

  return {
    purchasePackage,

    renewPackage,

    submitPackagePurchase(input) {
      const mode = input.mode ?? resolveSdkworkMembershipPurchaseMode({
        plan: input.plan,
        summary: input.summary,
      });
      const payload = createMembershipPurchasePayload(input);

      if (mode === "purchase") {
        return purchasePackage(payload);
      }

      if (mode === "renew") {
        return renewPackage(payload);
      }

      return upgradePackage(payload);
    },

    upgradePackage,
  };
}

export const sdkworkMembershipPurchaseService = createSdkworkMembershipPurchaseService();
