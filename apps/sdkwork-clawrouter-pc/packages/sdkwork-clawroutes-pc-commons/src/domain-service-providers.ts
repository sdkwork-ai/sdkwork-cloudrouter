import type { AccountAppSdkClient } from '@sdkwork/account-sdk-ports';
import {
  configureSdkworkAccountAppServiceProvider,
  configureSdkworkAccountSessionTokenProvider,
  createSdkworkAccountAppService,
} from '@sdkwork/account-service';
import type { MembershipAppSdkClient } from '@sdkwork/membership-sdk-ports';
import {
  configureSdkworkMembershipAppServiceProvider,
  configureSdkworkMembershipSessionTokenProvider,
  createSdkworkMembershipAppService,
} from '@sdkwork/membership-service';
import {
  configureSdkworkOrderAppServiceProvider,
  configureSdkworkOrderSessionTokenProvider,
  createSdkworkMembershipCheckoutService,
  createSdkworkCouponRechargeService,
  createSdkworkPointsRechargeService,
  createSdkworkOrderAppService,
  type SdkworkMembershipCheckoutService,
  type SdkworkCouponRechargeService,
  type SdkworkPointsRechargeService,
} from '@sdkwork/order-service';
import type { PaymentAppSdkClient } from '@sdkwork/payment-sdk-ports';
import {
  configureSdkworkPaymentAppServiceProvider,
  configureSdkworkPaymentSessionTokenProvider,
  createSdkworkPaymentAppService,
} from '@sdkwork/payment-service';
import type { PromotionAppSdkClient } from '@sdkwork/promotion-sdk-ports';
import {
  configureSdkworkPromotionAppServiceProvider,
  configureSdkworkPromotionSessionTokenProvider,
  createSdkworkPromotionAppService,
} from '@sdkwork/promotion-service';

import { loadStoredAppSessionToken } from './app-session-token.ts';
import {
  getSdkworkAccountAppSdkClient,
  getSdkworkMembershipAppSdkClient,
  getSdkworkOrderAppSdkClient,
  getSdkworkPaymentAppSdkClient,
  getSdkworkPromotionAppSdkClient,
  type SdkworkAccountAppSdkClient,
  type SdkworkMembershipAppSdkClient,
  type SdkworkOrderAppSdkClient,
  type SdkworkPaymentAppSdkClient,
  type SdkworkPromotionAppSdkClient,
} from './sdk-clients.ts';

let pointsRechargeService: SdkworkPointsRechargeService | null = null;
let membershipCheckoutService: SdkworkMembershipCheckoutService | null = null;
let couponRechargeService: SdkworkCouponRechargeService | null = null;

function readClawRouterDomainSessionTokens() {
  const session = loadStoredAppSessionToken();
  return {
    accessToken: session?.accessToken,
    authToken: session?.authToken,
    refreshToken: session?.refreshToken,
  };
}

function buildAccountCommercePort(
  accountClient: SdkworkAccountAppSdkClient,
  orderClient: SdkworkOrderAppSdkClient,
): AccountAppSdkClient['commerce'] {
  return {
    accounts: accountClient.accounts,
    recharges: orderClient.recharges,
    wallet: accountClient.wallet,
  } as unknown as AccountAppSdkClient['commerce'];
}

function buildMembershipCommercePort(
  membershipClient: SdkworkMembershipAppSdkClient,
  orderClient: SdkworkOrderAppSdkClient,
): MembershipAppSdkClient['commerce'] {
  return {
    memberships: membershipClient.memberships,
    recharges: orderClient.recharges,
  } as MembershipAppSdkClient['commerce'];
}

function buildPaymentCommercePort(client: SdkworkPaymentAppSdkClient): PaymentAppSdkClient['commerce'] {
  return {
    payments: client.commerce.payments,
  } as unknown as PaymentAppSdkClient['commerce'];
}

function buildPromotionCommercePort(client: SdkworkPromotionAppSdkClient): PromotionAppSdkClient['commerce'] {
  return {
    promotions: client.promotions,
  } as unknown as PromotionAppSdkClient['commerce'];
}

export function configureClawRouterDomainServiceProviders(): void {
  const readSessionTokens = readClawRouterDomainSessionTokens;
  const accountClient = getSdkworkAccountAppSdkClient();
  const membershipClient = getSdkworkMembershipAppSdkClient();
  const orderClient = getSdkworkOrderAppSdkClient();
  const paymentClient = getSdkworkPaymentAppSdkClient();
  const promotionClient = getSdkworkPromotionAppSdkClient();
  const orderAppService = createSdkworkOrderAppService({
    appClient: orderClient,
  });

  configureSdkworkAccountAppServiceProvider(() => createSdkworkAccountAppService({
    appClient: { commerce: buildAccountCommercePort(accountClient, orderClient) } as AccountAppSdkClient,
  }));
  configureSdkworkMembershipAppServiceProvider(() => createSdkworkMembershipAppService({
    appClient: { commerce: buildMembershipCommercePort(membershipClient, orderClient) } as MembershipAppSdkClient,
  }));
  configureSdkworkPaymentAppServiceProvider(() => createSdkworkPaymentAppService({
    appClient: { commerce: buildPaymentCommercePort(paymentClient) } as PaymentAppSdkClient,
  }));
  configureSdkworkOrderAppServiceProvider(() => orderAppService);
  membershipCheckoutService = createSdkworkMembershipCheckoutService({
    appService: orderAppService,
  });
  pointsRechargeService = createSdkworkPointsRechargeService({
    appService: orderAppService,
  });
  couponRechargeService = createSdkworkCouponRechargeService({
    appService: orderAppService,
  });
  configureSdkworkPromotionAppServiceProvider(() => createSdkworkPromotionAppService({
    appClient: { commerce: buildPromotionCommercePort(promotionClient) } as PromotionAppSdkClient,
  }));

  configureSdkworkAccountSessionTokenProvider(readSessionTokens);
  configureSdkworkMembershipSessionTokenProvider(readSessionTokens);
  configureSdkworkPaymentSessionTokenProvider(readSessionTokens);
  configureSdkworkOrderSessionTokenProvider(readSessionTokens);
  configureSdkworkPromotionSessionTokenProvider(readSessionTokens);
}

export function getClawRouterMembershipCheckoutService(): SdkworkMembershipCheckoutService {
  if (!membershipCheckoutService) {
    throw new Error('Claw Router membership checkout service is not configured.');
  }
  return membershipCheckoutService;
}

export function getClawRouterPointsRechargeService(): SdkworkPointsRechargeService {
  if (!pointsRechargeService) {
    throw new Error('Claw Router points recharge service is not configured.');
  }
  return pointsRechargeService;
}

export function getClawRouterCouponRechargeService(): SdkworkCouponRechargeService {
  if (!couponRechargeService) {
    throw new Error('Claw Router coupon recharge service is not configured.');
  }
  return couponRechargeService;
}
