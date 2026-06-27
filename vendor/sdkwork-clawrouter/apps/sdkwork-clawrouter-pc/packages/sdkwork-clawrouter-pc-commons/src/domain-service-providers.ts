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

type CommerceAppClientReader = () => {
  commerce: AccountAppSdkClient['commerce'];
};

function readClawRouterDomainSessionTokens() {
  const session = loadStoredAppSessionToken();
  return {
    accessToken: session?.accessToken,
    authToken: session?.authToken,
    refreshToken: session?.refreshToken,
  };
}

export function configureClawRouterDomainServiceProviders(
  getCommerceAppClient: CommerceAppClientReader,
): void {
  const readSessionTokens = readClawRouterDomainSessionTokens;
  const commerceClient = () => getCommerceAppClient().commerce;

  configureSdkworkAccountAppServiceProvider(() => createSdkworkAccountAppService({
    appClient: { commerce: commerceClient() } as AccountAppSdkClient,
  }));
  configureSdkworkMembershipAppServiceProvider(() => createSdkworkMembershipAppService({
    appClient: { commerce: commerceClient() } as MembershipAppSdkClient,
  }));
  configureSdkworkPaymentAppServiceProvider(() => createSdkworkPaymentAppService({
    appClient: { commerce: commerceClient() } as PaymentAppSdkClient,
  }));
  configureSdkworkOrderAppServiceProvider(() => createSdkworkOrderAppService({
    appClient: { commerce: commerceClient() } as OrderAppSdkClient,
  }));
  configureSdkworkPromotionAppServiceProvider(() => createSdkworkPromotionAppService({
    appClient: { commerce: commerceClient() } as PromotionAppSdkClient,
  }));

  configureSdkworkAccountSessionTokenProvider(readSessionTokens);
  configureSdkworkMembershipSessionTokenProvider(readSessionTokens);
  configureSdkworkPaymentSessionTokenProvider(readSessionTokens);
  configureSdkworkOrderSessionTokenProvider(readSessionTokens);
  configureSdkworkPromotionSessionTokenProvider(readSessionTokens);
}
