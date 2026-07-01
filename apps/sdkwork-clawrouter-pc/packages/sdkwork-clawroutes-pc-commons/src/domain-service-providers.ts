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
  createSdkworkOrderAppService,
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
import type { ClawRouterAppSdkClient } from './sdk-clients.ts';

type AppDomainClientReader = () => ClawRouterAppSdkClient;

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
  } as AccountAppSdkClient['commerce'];
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
  } as PaymentAppSdkClient['commerce'];
}

function buildOrderCommercePort(client: ClawRouterAppSdkClient): OrderAppSdkClient['commerce'] {
  return {
    cart: client.cart,
    checkout: client.checkout,
    orders: client.orders,
    refunds: client.refunds,
    fulfillments: client.fulfillments,
    shipments: client.shipments,
    afterSales: client.afterSales,
  } as OrderAppSdkClient['commerce'];
}

function buildPromotionCommercePort(client: ClawRouterAppSdkClient): PromotionAppSdkClient['commerce'] {
  return {
    promotions: client.promotions,
  } as PromotionAppSdkClient['commerce'];
}

export function configureClawRouterDomainServiceProviders(
  getAppDomainClient: AppDomainClientReader,
): void {
  const readSessionTokens = readClawRouterDomainSessionTokens;

  configureSdkworkAccountAppServiceProvider(() => createSdkworkAccountAppService({
    appClient: { commerce: buildAccountCommercePort(getAppDomainClient()) } as AccountAppSdkClient,
  }));
  configureSdkworkMembershipAppServiceProvider(() => createSdkworkMembershipAppService({
    appClient: { commerce: buildMembershipCommercePort(getAppDomainClient()) } as MembershipAppSdkClient,
  }));
  configureSdkworkPaymentAppServiceProvider(() => createSdkworkPaymentAppService({
    appClient: { commerce: buildPaymentCommercePort(getAppDomainClient()) } as PaymentAppSdkClient,
  }));
  configureSdkworkOrderAppServiceProvider(() => createSdkworkOrderAppService({
    appClient: { commerce: buildOrderCommercePort(getAppDomainClient()) } as OrderAppSdkClient,
  }));
  configureSdkworkPromotionAppServiceProvider(() => createSdkworkPromotionAppService({
    appClient: { commerce: buildPromotionCommercePort(getAppDomainClient()) } as PromotionAppSdkClient,
  }));

  configureSdkworkAccountSessionTokenProvider(readSessionTokens);
  configureSdkworkMembershipSessionTokenProvider(readSessionTokens);
  configureSdkworkPaymentSessionTokenProvider(readSessionTokens);
  configureSdkworkOrderSessionTokenProvider(readSessionTokens);
  configureSdkworkPromotionSessionTokenProvider(readSessionTokens);
}
