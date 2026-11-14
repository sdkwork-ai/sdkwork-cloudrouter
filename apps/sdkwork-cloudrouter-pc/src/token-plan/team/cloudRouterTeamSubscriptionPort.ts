import { getCloudRouterMembershipCheckoutService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import {
  getSdkworkAppbaseAppSdkClient,
  getSdkworkMembershipAppSdkClient,
  resetCloudRouterSdkClients,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { getCloudRouterIamRuntime } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  normalizeSdkworkTeamError,
  parseOwnMemberships,
  readSdkworkTeamPackageNumericId,
  SdkworkTeamSubscriptionError,
  type SdkworkTeamCheckoutInput,
  type SdkworkTeamCheckoutPayment,
  type SdkworkTeamOwnMembership,
  type SdkworkTeamPackage,
  type SdkworkTeamRosterPage,
  type SdkworkTeamRosterQuery,
  type SdkworkTeamSeatAssignment,
  type SdkworkTeamSeatAssignmentResult,
  type SdkworkTeamSeatPolicyInput,
  type SdkworkTeamSeatReconciliationResult,
  type SdkworkTeamSubscriptionOverview,
  type SdkworkTeamSubscriptionPort,
} from '@sdkwork/membership-pc-subscription/catalog';

/**
 * The only module that touches the organization (team) subscription SDK, the
 * IAM directory SDK, and the order-owned membership checkout.
 *
 * It implements the shared `SdkworkTeamSubscriptionPort`, so the seat surface,
 * the seat policy form, and the checkout hand-off all live in
 * `@sdkwork/membership-pc-subscription` and render identically in every host.
 *
 * Ownership split: membership publishes membership-owned facts (the team
 * subscription overview and the seat assignment rows); the organization roster,
 * the caller's role, and the member count are IAM-owned and read through the
 * published IAM app SDK. This module composes both fact sets so neither the
 * shared surface nor this adapter ever builds request headers or parses a
 * problem body by hand.
 */

type TeamMembershipsApi = ReturnType<typeof getSdkworkMembershipAppSdkClient>['memberships'];
type IamDirectoryApi = ReturnType<typeof getSdkworkAppbaseAppSdkClient>['iam'];

const TEAM_PACKAGE_PAGE_SIZE = 200;
const TEAM_PACKAGE_MAX_PAGES = 5;
/** IAM caps an organization roster page at 200 rows. */
const TEAM_ROSTER_PAGE_SIZE = 200;
const TEAM_SEAT_PAGE_SIZE = 100;
const TEAM_SEAT_MAX_PAGES = 20;

function teamMemberships(): TeamMembershipsApi {
  return getSdkworkMembershipAppSdkClient().memberships;
}

function iamDirectory(): IamDirectoryApi {
  return getSdkworkAppbaseAppSdkClient().iam;
}

function readTotalItems(pageInfo: { totalItems?: string } | undefined, fallback: number): number {
  const parsed = Number.parseInt(pageInfo?.totalItems ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readOrganizationName(
  record: Record<string, unknown>,
  organizationId: string,
): string | undefined {
  const id = record.id ?? record.organizationId;
  if (id !== organizationId) {
    return undefined;
  }
  const name = [record.name, record.displayName]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return name?.trim();
}

function searchOrganizationName(
  value: unknown,
  organizationId: string,
  depth: number,
): string | undefined {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = searchOrganizationName(entry, organizationId, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const direct = readOrganizationName(record, organizationId);
  if (direct) {
    return direct;
  }
  for (const entry of Object.values(record)) {
    const found = searchOrganizationName(entry, organizationId, depth + 1);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** Maps the order-owned checkout payment onto the shared team payment. */
function toTeamCheckoutPayment(
  payment: Awaited<ReturnType<ReturnType<typeof getCloudRouterMembershipCheckoutService>['createCheckout']>>,
): SdkworkTeamCheckoutPayment {
  return {
    status: payment.status,
    ...(payment.orderId ? { orderId: payment.orderId } : {}),
    ...(payment.qrCode ? { qrCode: payment.qrCode } : {}),
    ...(payment.cashierUrl ? { cashierUrl: payment.cashierUrl } : {}),
    ...(payment.amountCny === undefined ? {} : { amountCny: payment.amountCny }),
    ...(payment.expiresAt ? { expiresAt: payment.expiresAt } : {}),
  };
}

/**
 * Cloud Router implementation of the shared team subscription port.
 *
 * Every method normalizes its failure into a `SdkworkTeamSubscriptionError` so
 * the shared surface renders one localized message per backend reason.
 */
export const cloudRouterTeamSubscriptionPort: SdkworkTeamSubscriptionPort = {
  async getOverview(): Promise<SdkworkTeamSubscriptionOverview> {
    try {
      return await teamMemberships().teamSubscription.retrieve();
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async listSeatAssignments(seatLimit: number): Promise<readonly SdkworkTeamSeatAssignment[]> {
    try {
      const memberships = teamMemberships();
      const cap = Math.max(1, Math.trunc(seatLimit));
      const collected: SdkworkTeamSeatAssignment[] = [];
      for (let page = 1; page <= TEAM_SEAT_MAX_PAGES; page += 1) {
        const result = await memberships.teamSeats.list({
          page,
          pageSize: TEAM_SEAT_PAGE_SIZE,
        });
        collected.push(...result.items);
        if (result.pageInfo?.hasMore !== true || collected.length >= cap) {
          break;
        }
      }
      return collected.slice(0, cap);
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async listRosterPage(query: SdkworkTeamRosterQuery): Promise<SdkworkTeamRosterPage> {
    try {
      const result = await iamDirectory().organizations.members.list(query.organizationId, {
        page: query.page,
        pageSize: query.pageSize,
        ...(query.q?.trim() ? { q: query.q.trim() } : {}),
      });
      return {
        hasMore: result.pageInfo?.hasMore === true,
        items: result.items,
        page: result.pageInfo?.page ?? query.page,
        pageSize: result.pageInfo?.pageSize ?? query.pageSize,
        total: readTotalItems(result.pageInfo, result.items.length),
      };
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async listOwnMemberships(): Promise<readonly SdkworkTeamOwnMembership[]> {
    try {
      const result = await iamDirectory().organizationMemberships.list({
        pageSize: TEAM_ROSTER_PAGE_SIZE,
      });
      return parseOwnMemberships(result.items);
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async listPackages(): Promise<readonly SdkworkTeamPackage[]> {
    try {
      const memberships = teamMemberships();
      const packages: SdkworkTeamPackage[] = [];
      for (let page = 1; page <= TEAM_PACKAGE_MAX_PAGES; page += 1) {
        const result = await memberships.packages.list({
          audience: 'team',
          category: 'token',
          page,
          pageSize: TEAM_PACKAGE_PAGE_SIZE,
        });
        packages.push(...result.items);
        if (!result.pageInfo.hasMore) {
          break;
        }
      }
      return packages;
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  /**
   * Displays the organization name from the IAM directory when it is readable.
   *
   * Both IAM reads are permission-gated, so a failure here is not fatal: the
   * surface falls back to the organization id and never blocks the seat view.
   */
  async loadOrganizationName(organizationId: string): Promise<string | undefined> {
    const directory = iamDirectory();
    try {
      const page = await directory.organizations.list({ pageSize: TEAM_ROSTER_PAGE_SIZE });
      for (const item of page.items) {
        const name = readOrganizationName(item, organizationId);
        if (name) {
          return name;
        }
      }
    } catch {
      // Fall through to the tree read; the surface has a display fallback.
    }
    try {
      const tree = await directory.organizations.tree.retrieve();
      return searchOrganizationName(tree, organizationId, 0);
    } catch {
      return undefined;
    }
  },

  async assignSeat(userId: string): Promise<SdkworkTeamSeatAssignmentResult> {
    try {
      return await teamMemberships().teamSeats.create({ userId });
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async revokeSeat(userId: string): Promise<void> {
    try {
      await teamMemberships().teamSeats.delete(userId);
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async updateSeatPolicy(
    input: SdkworkTeamSeatPolicyInput,
  ): Promise<SdkworkTeamSubscriptionOverview> {
    try {
      return await teamMemberships().teamSeats.policy.update({
        autoAssignSeat: input.autoAssignSeat,
        seatPolicy: input.seatPolicy,
      });
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  /**
   * Reconciles the seat ledger with the IAM-owned roster.
   *
   * IAM owns organization membership, so membership never decides on its own
   * whether an assigned user left the organization: the endpoint asks the IAM
   * directory port and revokes every assignment whose user is no longer an
   * active member. `revokedCount` is 0 on a repeat call (idempotent).
   */
  async reconcileSeats(): Promise<SdkworkTeamSeatReconciliationResult> {
    try {
      return await teamMemberships().teamSeats.reconcile();
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  /**
   * Binds the caller's paid-but-unbound team subscription to an organization.
   *
   * Business rule: a team subscription can be bought before any organization
   * exists. The membership endpoint then answers the caller's unbound
   * subscription (`organizationBindingStatus: 'unbound'`, empty organizationId)
   * and this call consumes it: IAM authorizes the caller's
   * `TEAM_SEAT_MANAGE` capability in the target organization, and membership
   * re-scopes the subscription, audits `team_org_bind`, and returns the bound
   * overview the surface refreshes to.
   */
  async bindOrganization(organizationId: string): Promise<SdkworkTeamSubscriptionOverview> {
    try {
      return await teamMemberships().teamSubscription.bind({ organizationId });
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  /**
   * Starts the order-owned membership checkout for a team plan.
   *
   * `quantity` is the seat count of the requested action: the total seat count
   * for a first `purchase`, or the number of ADDITIONAL seats for `add_seats`.
   * A `purchase` needs no organization: the paid order is fulfilled as an
   * unbound team subscription that is bound to an organization afterwards.
   */
  async startCheckout(input: SdkworkTeamCheckoutInput): Promise<SdkworkTeamCheckoutPayment> {
    try {
      const payment = await getCloudRouterMembershipCheckoutService().createCheckout({
        // `add_seats` grows the existing subscription; only `purchase` starts one.
        action: input.action,
        packageId: readSdkworkTeamPackageNumericId(input.packageId),
        // Seats to ADD when expanding, the total seat count when subscribing.
        quantity: input.seats,
        paymentMethod: 'WECHAT',
        paymentProduct: 'mobile_cashier_h5',
      });
      return toTeamCheckoutPayment(payment);
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  async getCheckoutStatus(orderId: string): Promise<SdkworkTeamCheckoutPayment> {
    try {
      const payment = await getCloudRouterMembershipCheckoutService().getCheckoutStatus(orderId);
      return toTeamCheckoutPayment(payment);
    } catch (error) {
      throw normalizeSdkworkTeamError(error);
    }
  },

  /**
   * Switches the IAM session to another organization.
   *
   * Team endpoints resolve the organization from the authenticated principal, so
   * the session must be organization-scoped before the overview/roster reads can
   * succeed. The IAM app API's organization selection continues a sign-in
   * challenge; when this session has no pending challenge the platform answers
   * 400 and the surface sends the user through a fresh sign-in instead of
   * silently dropping the session.
   */
  async switchOrganization(organizationId: string): Promise<void> {
    try {
      await getSdkworkAppbaseAppSdkClient().auth.sessions.organizationSelection.create({
        organizationId,
      });
    } catch (error) {
      const normalized = normalizeSdkworkTeamError(error);
      if (normalized.httpStatus === 400) {
        throw new SdkworkTeamSubscriptionError(
          'organization_sign_in_required',
          normalized.message,
          normalized.httpStatus,
        );
      }
      throw normalized;
    }
    // Re-publish the IAM credentials the selection issued and rebuild the SDK
    // clients so every later read carries the new organization claim.
    await getCloudRouterIamRuntime().hydrateTokenManager();
    resetCloudRouterSdkClients();
  },
};
