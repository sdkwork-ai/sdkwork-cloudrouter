import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from './packages/sdkwork-cloudroutes-pc-commons/src/app-session-token.ts';
import { resetCloudRouterSdkClients } from './packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts';
import {
  createMembershipAdminPlan,
  disableMembershipAdminPlan,
  fetchMembershipAdminPlans,
  fetchMembershipAdminPackages,
  type MembershipsAdminPlanItem,
} from './packages/sdkwork-cloudrouter-pc-admin-memberships/src/membershipsService.ts';
import {
  classifyPurchaseModel,
  countPlansByQuadrant,
  filterPlans,
  groupPlansByAudience,
  MEMBERSHIP_PLAN_QUADRANTS,
  normalizeBillingCycles,
  planMatchesPurchaseModel,
  summarizePlans,
} from './packages/sdkwork-cloudrouter-pc-admin-memberships/src/planTaxonomy.ts';

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

type CapturedRequest = {
  url: string;
  method: string;
  body: unknown;
};

async function withMembershipSdkResponder<T>(
  responder: (request: CapturedRequest) => unknown,
  run: (captured: CapturedRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedRequest[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    enumerable: true,
    value: { dispatchEvent: () => true },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: CapturedRequest = {
      url: typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    captured.push(request);
    return new Response(JSON.stringify({ code: 0, data: responder(request) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  storeAppSessionFromResult({
    code: 0,
    data: { accessToken: 'membership-taxonomy-access-token', authToken: 'membership-taxonomy-auth-token' },
  });
  resetCloudRouterSdkClients();
  try {
    return await run(captured);
  } finally {
    clearStoredAppSessionToken();
    resetCloudRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function planFixture(patch: Partial<MembershipsAdminPlanItem>): MembershipsAdminPlanItem {
  return {
    id: 'plan-1',
    category: 'token',
    audience: 'personal',
    planNo: 'basic',
    levelCode: 'basic',
    name: 'Basic',
    rank: 1,
    status: 'active',
    benefitCount: 0,
    benefits: [],
    packageCount: 0,
    billingCycles: [],
    updatedAt: '2026-11-01T00:00:00Z',
    ...patch,
  };
}

test('purchase model is derived from package coverage instead of being stored twice', () => {
  assert.equal(classifyPurchaseModel([]), 'unlisted');
  assert.equal(classifyPurchaseModel(['month']), 'subscription');
  assert.equal(classifyPurchaseModel(['month', 'quarter', 'year']), 'subscription');
  assert.equal(classifyPurchaseModel(['once']), 'one_time');
  assert.equal(classifyPurchaseModel(['day', 'week']), 'one_time');
  assert.equal(classifyPurchaseModel(['once', 'year']), 'mixed');
  // Unknown cycles must not silently downgrade a plan to a one-time product.
  assert.equal(classifyPurchaseModel(['fortnight']), 'subscription');
});

test('billing cycles are de-duplicated and ordered once -> day -> week -> month -> quarter -> year', () => {
  assert.deepEqual(
    normalizeBillingCycles(['year', 'MONTH', 'year', ' once ', '']),
    ['once', 'month', 'year'],
  );
});

test('purchase-model filter keeps mixed plans visible in both views', () => {
  const subscriptionOnly = planFixture({ billingCycles: ['month'] });
  const oneTimeOnly = planFixture({ id: 'plan-2', billingCycles: ['once'] });
  const mixed = planFixture({ id: 'plan-3', billingCycles: ['once', 'year'] });
  const unlisted = planFixture({ id: 'plan-4', billingCycles: [] });

  assert.equal(planMatchesPurchaseModel(subscriptionOnly, 'subscription'), true);
  assert.equal(planMatchesPurchaseModel(subscriptionOnly, 'one_time'), false);
  assert.equal(planMatchesPurchaseModel(oneTimeOnly, 'one_time'), true);
  assert.equal(planMatchesPurchaseModel(oneTimeOnly, 'subscription'), false);
  assert.equal(planMatchesPurchaseModel(mixed, 'subscription'), true);
  assert.equal(planMatchesPurchaseModel(mixed, 'one_time'), true);
  assert.equal(planMatchesPurchaseModel(unlisted, 'all'), true);
  assert.equal(planMatchesPurchaseModel(unlisted, 'subscription'), false);
});

test('audience and family filters compose with the purchase-model filter', () => {
  const plans = [
    planFixture({ id: 'p-basic-month', audience: 'personal', billingCycles: ['month'] }),
    planFixture({ id: 'p-basic-single', audience: 'personal', billingCycles: ['once'] }),
    planFixture({ id: 't-starter-month', audience: 'team', billingCycles: ['month'] }),
    planFixture({ id: 'c-basic-year', audience: 'personal', category: 'community', billingCycles: ['year'] }),
  ];

  assert.deepEqual(
    filterPlans(plans, { audience: 'all', purchaseModel: 'all' }).map((plan) => plan.id),
    ['p-basic-month', 'p-basic-single', 't-starter-month', 'c-basic-year'],
  );
  assert.deepEqual(
    filterPlans(plans, { audience: 'team', purchaseModel: 'subscription' }).map((plan) => plan.id),
    ['t-starter-month'],
  );
  assert.deepEqual(
    filterPlans(plans, { audience: 'personal', purchaseModel: 'all', category: 'community' }).map((plan) => plan.id),
    ['c-basic-year'],
  );
});

test('summary and audience grouping agree with the rows in view', () => {
  const plans = [
    planFixture({ id: 'p1', audience: 'personal', billingCycles: ['month'], rank: 2 }),
    planFixture({ id: 'p2', audience: 'personal', billingCycles: ['once'], rank: 1 }),
    planFixture({ id: 'p3', audience: 'team', billingCycles: ['once', 'year'], rank: 3 }),
    planFixture({ id: 'p4', audience: 'team', billingCycles: [], rank: 1 }),
  ];

  assert.deepEqual(summarizePlans(plans), {
    total: 4,
    personal: 2,
    team: 2,
    subscription: 2,
    oneTime: 2,
    unlisted: 1,
  });

  const groups = groupPlansByAudience(plans);
  assert.deepEqual(groups.map((group) => group.audience), ['personal', 'team']);
  assert.deepEqual(groups[0]?.plans.map((plan) => plan.id), ['p2', 'p1']);
  assert.deepEqual(groups[1]?.plans.map((plan) => plan.id), ['p4', 'p3']);
});

test('the four catalog quadrants cover audience x purchase model exactly once', () => {
  const keys = MEMBERSHIP_PLAN_QUADRANTS.map(
    (quadrant) => `${quadrant.audience}:${quadrant.purchaseModel}`,
  );
  assert.deepEqual(keys, [
    'personal:subscription',
    'personal:one_time',
    'team:subscription',
    'team:one_time',
  ]);
});

test('quadrant counts put a mixed plan in both purchase models and skip unlisted plans', () => {
  const counts = countPlansByQuadrant([
    planFixture({ id: 'p-sub', audience: 'personal', billingCycles: ['month'] }),
    planFixture({ id: 'p-once', audience: 'personal', billingCycles: ['once'] }),
    planFixture({ id: 'p-mixed', audience: 'personal', billingCycles: ['once', 'year'] }),
    planFixture({ id: 'p-unlisted', audience: 'personal', billingCycles: [] }),
    planFixture({ id: 't-mixed', audience: 'team', billingCycles: ['once', 'month'] }),
  ]);
  assert.deepEqual(counts, {
    'personal:subscription': 2,
    'personal:one_time': 2,
    'team:subscription': 1,
    'team:one_time': 1,
  });
});

test('plan list sends both classification filters through the generated membership SDK', async () => {
  await withMembershipSdkResponder(
    () => ({
      items: [{
        id: 'plan-team-starter',
        code: 'team-starter',
        name: 'Team Starter',
        rank: '1',
        status: 'active',
        category: 'token',
        audience: 'team',
        benefits: [],
        packageCount: '3',
        billingCycles: ['year', 'month'],
      }],
      pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '1', totalPages: 1, hasMore: false },
    }),
    async (captured) => {
      const result = await fetchMembershipAdminPlans({
        page: 1,
        pageSize: 20,
        audience: 'team',
        purchaseModel: 'subscription',
      });

      assert.equal(captured.length, 1);
      const url = new URL(captured[0]!.url, 'http://sdkwork.test');
      assert.equal(url.pathname, '/backend/v3/api/memberships/plans');
      assert.equal(url.searchParams.get('audience'), 'team');
      // The purchase model is derived server-side from package coverage, so the
      // filter must be on the wire for pagination and totals to stay truthful.
      assert.equal(url.searchParams.get('purchase_model'), 'subscription');
      assert.equal(result.items[0]?.audience, 'team');
      assert.equal(result.items[0]?.packageCount, 3);
      // Canonical ordering is applied while normalizing.
      assert.deepEqual(result.items[0]?.billingCycles, ['month', 'year']);
    },
  );
});

test('package list requests the audience slice too', async () => {
  await withMembershipSdkResponder(
    () => ({
      items: [],
      pageInfo: { mode: 'offset', page: 1, pageSize: 20, totalItems: '0', totalPages: 0, hasMore: false },
    }),
    async (captured) => {
      await fetchMembershipAdminPackages({ page: 1, pageSize: 20, audience: 'team' });
      const url = new URL(captured[0]!.url, 'http://sdkwork.test');
      assert.equal(url.pathname, '/backend/v3/api/memberships/packages');
      assert.equal(url.searchParams.get('audience'), 'team');
    },
  );
});

test('creating a plan always sends the audience classification', async () => {
  await withMembershipSdkResponder(
    () => ({
      id: 'plan-new',
      code: 'team-growth',
      name: 'Team Growth',
      rank: '2',
      status: 'active',
      category: 'token',
      audience: 'team',
      benefits: [],
      packageCount: '0',
      billingCycles: [],
    }),
    async (captured) => {
      await createMembershipAdminPlan({
        category: 'token',
        audience: 'team',
        code: 'team-growth',
        name: 'Team Growth',
        rank: 2,
        status: 'active',
        benefits: [],
      });

      assert.equal(captured.length, 1);
      assert.equal(captured[0]!.method, 'POST');
      assert.match(captured[0]!.url, /\/backend\/v3\/api\/memberships\/plans$/);
      assert.deepEqual(
        { ...(captured[0]!.body as Record<string, unknown>), benefits: [] },
        {
          category: 'token',
          audience: 'team',
          code: 'team-growth',
          name: 'Team Growth',
          rank: '2',
          status: 'active',
          benefits: [],
        },
      );
    },
  );
});

test('stop-selling a plan uses the soft-delete management operation', async () => {
  await withMembershipSdkResponder(
    () => ({}),
    async (captured) => {
      await disableMembershipAdminPlan('plan-team-starter');
      assert.equal(captured.length, 1);
      assert.equal(captured[0]!.method, 'DELETE');
      assert.match(captured[0]!.url, /\/backend\/v3\/api\/memberships\/plans\/plan-team-starter$/);
    },
  );
});

test('the membership centre keeps one catalog per concept and retires the duplicate VIP price list', () => {
  const registrySource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts',
  );
  const membershipsSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-memberships/src/index.tsx',
  );

  // The catalog group lists exactly the three catalog concepts: plans, prices,
  // billing periods. `vipPackages` was a second identical price list and must
  // not come back as a menu entry.
  assert.doesNotMatch(registrySource, /\/admin\/memberships\/vipPackages/);
  assert.match(registrySource, /\/admin\/memberships\/plans/);
  assert.match(registrySource, /\/admin\/memberships\/packages/);
  assert.match(registrySource, /\/admin\/memberships\/packageGroups/);

  // The retired route still resolves, and resolves to the single price catalog.
  assert.match(membershipsSource, /'vipPackages'/);
  const vipBranch = membershipsSource.slice(
    membershipsSource.indexOf("activeSection === 'vipPackages'"),
    membershipsSource.indexOf("activeSection === 'packageGroups'"),
  );
  assert.match(vipBranch, /<MembershipPackagesPage \/>/);
  assert.doesNotMatch(membershipsSource, /MembershipVipPackagesPage/);
});

test('the plans page is organised by audience x purchase model and offers stop-selling', () => {
  const pageSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx',
  );
  const formSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-memberships/src/forms/MembershipPlanDrawerForm.tsx',
  );
  const serviceSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-memberships/src/membershipsService.ts',
  );

  assert.match(pageSource, /MembershipPlanQuadrantNav/);
  assert.match(pageSource, /MembershipPlanSummaryStrip/);
  assert.match(pageSource, /MembershipAudienceBadge/);
  assert.match(pageSource, /MembershipPurchaseModelBadge/);
  assert.match(pageSource, /MembershipBillingCycleChips/);
  assert.match(pageSource, /disableMembershipAdminPlan/);
  assert.match(pageSource, /groupPlansByAudience/);
  // Both classification axes are requested from the API; the purchase model is
  // derived there from package coverage.
  assert.match(pageSource, /audience: requestedAudience === 'all' \? undefined : requestedAudience/);
  assert.match(
    pageSource,
    /purchaseModel: requestedPurchaseModel === 'all' \? undefined : requestedPurchaseModel/,
  );

  assert.match(formSource, /audience/);
  assert.match(formSource, /MembershipAudienceBadge|membershipAudienceLabel/);
  assert.match(formSource, /coverageHint/);

  assert.doesNotMatch(serviceSource, /\baxios\b/);
  assert.doesNotMatch(serviceSource, /new XMLHttpRequest/);
  assert.doesNotMatch(serviceSource, /['"`]\/backend\/v3\/api/);
});
