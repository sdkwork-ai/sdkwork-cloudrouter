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
  createMembershipAppTransportClient,
  hasSdkworkMembershipSession,
  unwrapSdkworkMembershipPageItems,
  unwrapSdkworkMembershipResponse,
  type SdkworkMembershipAppService,
} from '@sdkwork/membership-service';
import {
  createClient as createIamAppClient,
  type SdkworkAppClient as IamAppSdkClient,
} from '@sdkwork/iam-app-sdk';

/** Generated membership app client; the transport type is owned by the service. */
export type MembershipAppClient = ReturnType<typeof createMembershipAppTransportClient>;
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
import { applyCloudRouterSessionTokens, getCloudRouterTokenManager } from '../session/tokenManager.js';
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
  /**
   * IAM app client for the organization (team) facts: the caller's own
   * organization memberships, the organization roster, organization names, and
   * the organization-selection login hand-off.
   */
  readonly iamApp: IamAppSdkClient;
  readonly membership: SdkworkMembershipAppService;
  /**
   * Generated membership app client for the team surface.
   *
   * The membership domain service exposes the personal catalog/status commands
   * only; the organization (team) subscription, seat ledger, and seat policy are
   * served by the same membership app API and type their responses through this
   * generated client, so the H5 composition root exposes it once.
   */
  readonly membershipApp: MembershipAppClient;
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
  const membershipApp = createMembershipAppTransportClient({ baseUrl, platform: 'H5', tokenManager });
  const iamApp = createIamAppClient({ baseUrl, platform: 'H5', tokenManager });
  const order = createSdkworkOrderAppService({ appClient: getCloudRouterH5OrderAppSdkClient() });
  configureSdkworkOrderAppServiceProvider(() => order);
  bindSessionTokenProviders();

  return {
    account,
    couponRecharge: createSdkworkCouponRechargeService({ appService: order }),
    iamApp,
    membership,
    membershipApp,
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

function readIssuedToken(value: unknown, keys: readonly string[]): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  for (const nestedKey of ['session', 'item', 'data']) {
    const nested = record[nestedKey];
    if (!nested || typeof nested !== 'object') {
      continue;
    }
    const nestedRecord = nested as Record<string, unknown>;
    for (const key of keys) {
      const candidate = nestedRecord[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return undefined;
}

/**
 * Rotates the current IAM session into an organization scope.
 *
 * Team endpoints resolve the organization from the authenticated principal, so
 * switching organizations means re-minting the session context. The IAM app API
 * rotates the current session (`PATCH /auth/sessions/current` with the target
 * organization) and answers the new dual tokens plus the organization context;
 * those tokens are committed to the one shared TokenManager, so every generated
 * client switches scope without being rebuilt.
 *
 * @param organizationId - IAM organization to scope the session to.
 * @returns `true` when a new dual-token session was committed.
 */
export async function selectCloudRouterOrganization(organizationId: string): Promise<boolean> {
  const services = getCloudRouterH5CommerceServices();
  const result = await services.iamApp.auth.sessions.current.update({ organizationId });
  const accessToken = readIssuedToken(result, ['accessToken', 'access_token']);
  const authToken = readIssuedToken(result, ['authToken', 'auth_token']);
  if (!accessToken || !authToken) {
    return false;
  }
  applyCloudRouterSessionTokens(accessToken, authToken);
  return true;
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
