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
import type { OrderAppSdkClient } from '@sdkwork/order-sdk-ports';
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
  type ClawRouterAppSdkClient,
} from './sdk-clients.ts';

type AppDomainClientReader = () => ClawRouterAppSdkClient;

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

function buildAccountCommercePort(client: ClawRouterAppSdkClient): AccountAppSdkClient['commerce'] {
  return {
    accounts: client.accounts,
    recharges: client.recharges,
    wallet: client.wallet,
  } as unknown as AccountAppSdkClient['commerce'];
}

function buildMembershipCommercePort(client: ClawRouterAppSdkClient): MembershipAppSdkClient['commerce'] {
  return {
    memberships: client.memberships,
    recharges: client.recharges,
  } as MembershipAppSdkClient['commerce'];
}

function buildPaymentCommercePort(client: ClawRouterAppSdkClient): PaymentAppSdkClient['commerce'] {
  return {
    payments: client.payments,
  } as unknown as PaymentAppSdkClient['commerce'];
}

function buildOrderCommercePort(client: ClawRouterAppSdkClient): OrderAppSdkClient['commerce'] {
  return {
    memberships: client.memberships,
    cart: client.cart,
    checkout: client.checkout,
    orders: client.orders,
    refunds: client.refunds,
    fulfillments: client.fulfillments,
    shipments: client.shipments,
    afterSales: client.afterSales,
    recharges: client.recharges,
  } as OrderAppSdkClient['commerce'];
}

function buildPromotionCommercePort(client: ClawRouterAppSdkClient): PromotionAppSdkClient['commerce'] {
  return {
    promotions: client.promotions,
  } as unknown as PromotionAppSdkClient['commerce'];
}

export function configureClawRouterDomainServiceProviders(
  getAppDomainClient: AppDomainClientReader,
): void {
  const readSessionTokens = readClawRouterDomainSessionTokens;
  const orderAppService = createSdkworkOrderAppService({
    appClient: { commerce: buildOrderCommercePort(getAppDomainClient()) } as OrderAppSdkClient,
  });

  configureSdkworkAccountAppServiceProvider(() => createSdkworkAccountAppService({
    appClient: { commerce: buildAccountCommercePort(getAppDomainClient()) } as AccountAppSdkClient,
  }));
  configureSdkworkMembershipAppServiceProvider(() => createSdkworkMembershipAppService({
    appClient: { commerce: buildMembershipCommercePort(getAppDomainClient()) } as MembershipAppSdkClient,
  }));
  configureSdkworkPaymentAppServiceProvider(() => createSdkworkPaymentAppService({
    appClient: { commerce: buildPaymentCommercePort(getAppDomainClient()) } as PaymentAppSdkClient,
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
    appClient: { commerce: buildPromotionCommercePort(getAppDomainClient()) } as PromotionAppSdkClient,
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
