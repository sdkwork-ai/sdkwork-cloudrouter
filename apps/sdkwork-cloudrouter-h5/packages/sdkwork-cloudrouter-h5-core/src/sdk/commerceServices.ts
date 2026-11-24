import {
  bootstrapSdkworkAccountAppService,
  configureSdkworkAccountSessionTokenProvider,
  hasSdkworkAccountSession,
  toSdkworkAccountPointsFromMicro,
  unwrapSdkworkAccountResource,
  unwrapSdkworkAccountResponse,
  type SdkworkAccountAppService,
} from '@sdkwork/account-service';
import {
  bootstrapSdkworkMembershipAppService,
  configureSdkworkMembershipSessionTokenProvider,
  hasSdkworkMembershipSession,
  unwrapSdkworkMembershipPageItems,
  unwrapSdkworkMembershipResponse,
  type SdkworkMembershipAppService,
} from '@sdkwork/membership-service';
import {
  configureSdkworkOrderAppServiceProvider,
  configureSdkworkOrderSessionTokenProvider,
  createSdkworkCouponRechargeService,
  createSdkworkMembershipCheckoutService,
  createSdkworkOrderAppService,
  createSdkworkTokenBankRechargeService,
  hasSdkworkOrderSession,
  unwrapSdkworkOrderListPage,
  unwrapSdkworkOrderResource,
  type SdkworkCouponRechargeService,
  type SdkworkMembershipCheckoutService,
  type SdkworkOrderAppService,
  type SdkworkPointsRechargeService,
} from '@sdkwork/order-service';

import { readCloudRouterSession } from '../session/sessionStore.js';
import { getCloudRouterTokenManager } from '../session/tokenManager.js';
import { getCloudRouterH5OrderAppSdkClient } from './orderAppSdkClient.js';
import { resolveCloudRouterAppApiBaseUrl } from './runtimeEnv.js';

/**
 * Membership/account/order domain services for the H5 commerce surfaces.
 *
 * The token-plan (`/membership`) and Token Bank (`/recharge`) screens render the
 * same membership definition the PC portal's `/token-plan` page reads: the
 * membership catalog (billing-cycle package groups, plans, benefits by rank),
 * the signed-in member status, the Token Bank compute-credit balance, and the
 * order-owned checkout/recharge commands. Every call rides the domain service
 * layer (`@sdkwork/membership-service`, `@sdkwork/account-service`,
 * `@sdkwork/order-service`) on top of the generated app SDK clients, so the H5
 * renderer never assembles raw HTTP or credentials
 * (`APP_SDK_INTEGRATION_SPEC.md` section 4).
 *
 * Construction is owned here because the H5 core is the renderer composition
 * root (`APP_H5_ARCHITECTURE_SPEC.md`): feature packages receive these services
 * through the membership runtime port and never build SDK clients themselves.
 */
export interface CloudRouterH5CommerceServices {
  readonly account: SdkworkAccountAppService;
  /** Coupon/code redemption (membership activation or Token Bank credit). */
  readonly couponRecharge: SdkworkCouponRechargeService;
  readonly membership: SdkworkMembershipAppService;
  readonly membershipCheckout: SdkworkMembershipCheckoutService;
  readonly order: SdkworkOrderAppService;
  /** Token Bank compute-credit recharge (`token_bank_recharge` → `token_bank`). */
  readonly tokenBankRecharge: SdkworkPointsRechargeService;
}

let commerceServices: CloudRouterH5CommerceServices | null = null;

/**
 * Binds the domain service session-token providers to the H5 dual-token session.
 *
 * `requireSdkworkMembershipSession` / `requireSdkworkOrderSession` read the
 * globally configured providers, so they must point at the same TokenManager
 * every generated app SDK client uses; otherwise an authenticated purchase
 * would be rejected before the request is built.
 */
function bindSessionTokenProviders(): void {
  const readTokens = () => getCloudRouterTokenManager().getTokens();
  configureSdkworkMembershipSessionTokenProvider(readTokens);
  configureSdkworkAccountSessionTokenProvider(readTokens);
  configureSdkworkOrderSessionTokenProvider(readTokens);
}

/**
 * Builds the H5 membership/account/order service bundle once per page load.
 *
 * The order application service reuses the generated order client the cashier
 * runtime already holds, and every checkout/recharge service receives that
 * service explicitly, so no second transport root is created.
 */
export function createCloudRouterH5CommerceServices(): CloudRouterH5CommerceServices {
  // One app API origin for every generated client: the domain SDKs and the
  // Cloud Router console SDK append their own `/app/v3/api` prefix
  // (`CONFIG_SPEC.md` section 3.1 keeps browser bases same-origin).
  const baseUrl = resolveCloudRouterAppApiBaseUrl();
  const tokenManager = getCloudRouterTokenManager();

  const membership = bootstrapSdkworkMembershipAppService({ baseUrl, platform: 'H5', tokenManager });
  const account = bootstrapSdkworkAccountAppService({ baseUrl, platform: 'H5', tokenManager });
  const order = createSdkworkOrderAppService({ appClient: getCloudRouterH5OrderAppSdkClient() });
  configureSdkworkOrderAppServiceProvider(() => order);
  bindSessionTokenProviders();

  return {
    account,
    couponRecharge: createSdkworkCouponRechargeService({ appService: order }),
    membership,
    membershipCheckout: createSdkworkMembershipCheckoutService({ appService: order }),
    order,
    tokenBankRecharge: createSdkworkTokenBankRechargeService({ appService: order }),
  };
}

export function initCloudRouterH5CommerceServices(): CloudRouterH5CommerceServices {
  commerceServices = createCloudRouterH5CommerceServices();
  return commerceServices;
}

export function getCloudRouterH5CommerceServices(): CloudRouterH5CommerceServices {
  if (!commerceServices) {
    return initCloudRouterH5CommerceServices();
  }
  return commerceServices;
}

/** Test seam: drops the bound service bundle between test cases. */
export function resetCloudRouterH5CommerceServices(): void {
  commerceServices = null;
}

/**
 * Reports whether the H5 renderer holds a signed-in session for commerce calls.
 *
 * The domain service session helpers read the IAM runtime projection, which the
 * H5 renderer does not mount; the H5 session store is the renderer's authority
 * (the PC portal resolves the same question from its portal session).
 */
export function hasCloudRouterCommerceSession(): boolean {
  return readCloudRouterSession().authenticated;
}

export {
  hasSdkworkAccountSession,
  hasSdkworkMembershipSession,
  hasSdkworkOrderSession,
  toSdkworkAccountPointsFromMicro,
  unwrapSdkworkAccountResource,
  unwrapSdkworkAccountResponse,
  unwrapSdkworkMembershipPageItems,
  unwrapSdkworkMembershipResponse,
  unwrapSdkworkOrderListPage,
  unwrapSdkworkOrderResource,
};
