/**
 * Cloud Router H5 membership (token-plan) alignment regression.
 *
 * The H5 `/membership` and `/recharge` surfaces must present the same
 * membership definition as the PC portal's `/token-plan` page: the plan ranks
 * and tier keys, the billing-cycle groups, the per-period compute-credit
 * allowance, the plan-card feature rows, and the benefit comparison matrix. The
 * PC source of truth is the shared membership subscription mapper the PC surface
 * consumes; this test fails when either side drifts, and it also guards the H5
 * replacement of the demo VIP/Token purchase prototypes.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');
const MEMBERSHIP_PACKAGE = 'packages/sdkwork-cloudrouter-h5-membership';
const PC_MAPPER_PATH = path.resolve(
  REPO,
  '../sdkwork-membership/apps/sdkwork-membership-pc/packages/sdkwork-membership-pc-subscription/src/subscription-catalog-mapper.ts',
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath).replace(/^\uFEFF/u, ''));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function parseRankDisplay(source) {
  const mapping = {};
  const start = source.indexOf('PLAN_RANK_DISPLAY');
  assert.ok(start >= 0, 'missing PLAN_RANK_DISPLAY');
  const end = source.indexOf('};', start);
  assert.ok(end > start, 'missing the PLAN_RANK_DISPLAY terminator');
  for (const match of source
    .slice(start, end)
    .matchAll(/(\d)\s*:\s*\{\s*membershipTierKey:\s*['"]([a-z]+)['"]/gu)) {
    mapping[match[1]] = match[2];
  }
  return mapping;
}

function parseCompareBlock(source) {
  return source
    .slice(source.indexOf('COMPARE_BENEFIT_ROWS'), source.indexOf('resolvePlanRankFromPackage'))
    .replace(/^-+$/gmu, '');
}

function benefitKeys(source) {
  return uniqueSorted(
    [...parseCompareBlock(source).matchAll(/['"]([a-z][a-z0-9_]{1,})['"]/gu)].map((match) => match[1]),
  );
}

function compareCategoryLabels(source) {
  return [...parseCompareBlock(source).matchAll(/categoryLabel:\s*['"]([^'"]+)['"]/gu)].map(
    (match) => match[1],
  );
}

function compareRowLabels(source) {
  return [...parseCompareBlock(source).matchAll(/\blabel:\s*['"]([^'"]+)['"]/gu)].map(
    (match) => match[1],
  );
}

function featureBlock(source) {
  const start = source.indexOf('function resolveFeatureTemplates');
  assert.ok(start >= 0, 'missing resolveFeatureTemplates');
  const rest = source.slice(start + 1);
  const nextFunction = rest.search(/\nfunction /u);
  return nextFunction >= 0 ? rest.slice(0, nextFunction) : rest;
}

function chineseStrings(source) {
  return uniqueSorted(
    [...source.matchAll(/['"]([\u4e00-\u9fff][^'"]*)['"]/gu)].map((match) => match[1]),
  );
}

describe('H5 membership token-plan alignment', () => {
  const pcMapper = fs.existsSync(PC_MAPPER_PATH) ? fs.readFileSync(PC_MAPPER_PATH, 'utf8') : null;
  const h5Definition = read(`${MEMBERSHIP_PACKAGE}/src/catalog/membershipDefinition.ts`);

  it('keeps the PC token-plan membership definition available for comparison', () => {
    assert.ok(
      pcMapper,
      `the PC token-plan definition is required for the alignment regression: ${PC_MAPPER_PATH}`,
    );
  });

  it('maps every plan rank to the same membership tier key as the PC token-plan page', () => {
    assert.deepEqual(parseRankDisplay(h5Definition), parseRankDisplay(pcMapper));
    assert.deepEqual(parseRankDisplay(h5Definition), {
      1: 'pro',
      2: 'peak',
      3: 'peak',
      4: 'super',
    });
  });

  it('compares the same benefit rows, categories, and benefit keys', () => {
    assert.deepEqual(compareCategoryLabels(h5Definition), compareCategoryLabels(pcMapper));
    assert.deepEqual(compareRowLabels(h5Definition), compareRowLabels(pcMapper));
    assert.deepEqual(benefitKeys(h5Definition), benefitKeys(pcMapper));
    assert.ok(compareRowLabels(h5Definition).length >= 13, 'the comparison matrix keeps every row');
  });

  it('keeps the same plan-card feature rows per rank', () => {
    assert.deepEqual(chineseStrings(featureBlock(h5Definition)), chineseStrings(featureBlock(pcMapper)));
  });

  it('monthlyizes the membership compute-credit allowance the same way', () => {
    for (const token of ['Math.round(pointAmount / 12)', 'Math.round(pointAmount / 3)']) {
      assert.ok(h5Definition.includes(token), `H5 allowance math ${token}`);
      assert.ok(pcMapper.includes(token), `PC allowance math ${token}`);
    }
    assert.ok(
      /Math\.round\(\s*\(?pointAmount \/ Math\.max\(priceCny, 1\)\)? \* 10\)/u.test(h5Definition),
      'the H5 points conversion uses the PC conversion rule',
    );
    assert.ok(
      /Math\.round\(pointAmount \/ Math\.max\(priceCny, 1\) \* 10\)/u.test(pcMapper),
      'the PC points conversion rule is unchanged',
    );
  });

  it('renders the plan catalog from the membership domain service, not demo plans', () => {
    const runtime = read(`${MEMBERSHIP_PACKAGE}/src/runtime.ts`);
    for (const call of [
      'memberships.packageGroups.list',
      'memberships.plans.list',
      'memberships.benefits.list',
      'memberships.current.retrieve',
      'memberships.current.status.retrieve',
      'tokenBank.account.retrieve',
      'membershipCheckout.createCheckout',
      'tokenBankRecharge.createOrder',
      'couponRecharge.redeem',
    ]) {
      assert.ok(runtime.includes(call), `membership runtime calls ${call}`);
    }
    assert.ok(
      runtime.includes("paymentProduct: 'mobile_cashier_h5'"),
      'membership purchases hand off through the mobile H5 cashier',
    );
  });

  it('builds the membership surfaces on the H5 commerce services', () => {
    const coreServices = read(
      'packages/sdkwork-cloudrouter-h5-core/src/sdk/commerceServices.ts',
    );
    for (const token of [
      'bootstrapSdkworkMembershipAppService',
      'bootstrapSdkworkAccountAppService',
      'createSdkworkMembershipCheckoutService',
      'createSdkworkTokenBankRechargeService',
      'createSdkworkCouponRechargeService',
    ]) {
      assert.ok(coreServices.includes(token), `H5 commerce services compose ${token}`);
    }
    const bootstrap = read('src/bootstrap/sdkClients.ts');
    assert.ok(bootstrap.includes('initCloudRouterH5CommerceServices()'));
    assert.ok(bootstrap.includes('bootstrapCloudRouterH5Membership()'));
  });

  it('mounts the membership catalog, comparison, and commerce steps on the H5 screens', () => {
    const screen = read(`${MEMBERSHIP_PACKAGE}/src/screens/MembershipScreen.tsx`);
    for (const token of [
      'MembershipHero',
      'BillingCycleTabs',
      'PlanCardList',
      'TierCompareTable',
      'CheckoutSheet',
      'TokenBankRechargeSheet',
      'TokenBankDetailsSheet',
      'RedeemSheet',
      'mapPackagesToPlanCards',
      'mapPackagesToTierColumns',
      'buildComparisonCategories',
    ]) {
      assert.ok(screen.includes(token), `membership screen composes ${token}`);
    }
    const cards = read(`${MEMBERSHIP_PACKAGE}/src/components/MembershipPlans.tsx`);
    for (const field of [
      'priceLabel',
      'originalPriceLabel',
      'periodLabel',
      'pointsAllowanceLabel',
      'pointsConversionLabel',
      'discountTag',
      'features',
    ]) {
      assert.ok(cards.includes(field), `plan cards render ${field}`);
    }
    const compare = read(`${MEMBERSHIP_PACKAGE}/src/components/TierCompareTable.tsx`);
    assert.ok(compare.includes('category.rows'), 'the comparison renders every benefit row');
    assert.ok(compare.includes('benefitLabel'), 'the comparison renders the benefit labels');
  });

  it('mounts the Cloud Router membership routes and drops the demo commerce prototypes', () => {
    const routes = read('src/routes/CommerceRoutes.tsx');
    assert.ok(routes.includes('MembershipScreen'));
    assert.ok(routes.includes('TokenRechargeScreen'));
    assert.ok(routes.includes('CloudRouterMembershipI18nProvider'));
    assert.ok(routes.includes('createMembershipTranslate'));
    for (const removed of [
      /from\s+'@sdkwork\/membership-mobile-react-subscription'/u,
      /<VipSubscriptionPage/u,
      /<TokenRechargePage/u,
    ]) {
      assert.ok(!removed.test(routes), `the demo prototype ${removed} is gone from the commerce routes`);
    }
    const app = read('src/App.tsx');
    assert.ok(app.includes('path="/membership"'));
    assert.ok(app.includes('path="/recharge"'));
    const manifest = readJson('package.json');
    assert.ok(manifest.dependencies['@sdkwork/cloudrouter-h5-membership'] === 'workspace:*');
    assert.ok(!manifest.dependencies['@sdkwork/membership-mobile-react-subscription']);
  });

  it('ships zh-CN and en-US copy for every membership key the surfaces use', () => {
    const zh = read(`${MEMBERSHIP_PACKAGE}/../sdkwork-cloudrouter-h5-i18n/src/i18n/zh-CN/cloudrouter/commerce/membership.ts`);
    const en = read(`${MEMBERSHIP_PACKAGE}/../sdkwork-cloudrouter-h5-i18n/src/i18n/en-US/cloudrouter/commerce/membership.ts`);
    const keyPattern = /'(cloudrouter\.console\.membership\.[^']+)':\s*"/gu;
    const zhKeys = uniqueSorted([...zh.matchAll(keyPattern)].map((match) => match[1]));
    const enKeys = uniqueSorted([...en.matchAll(keyPattern)].map((match) => match[1]));
    assert.ok(zhKeys.length > 80, 'the membership copy catalog is populated');
    assert.deepEqual(enKeys, zhKeys);

    const sources = [
      `${MEMBERSHIP_PACKAGE}/src/screens/MembershipScreen.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/screens/TokenRechargeScreen.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/MembershipHero.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/MembershipPlans.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/TierCompareTable.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/CommerceSheets.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/TeamMembershipSurface.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/TeamPlanCards.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/TeamSeatManagement.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/components/TeamCheckoutSheet.tsx`,
      `${MEMBERSHIP_PACKAGE}/src/team/teamErrorCopy.ts`,
      `${MEMBERSHIP_PACKAGE}/src/team/teamPricing.ts`,
      `${MEMBERSHIP_PACKAGE}/src/team/useTeamMembership.ts`,
      `${MEMBERSHIP_PACKAGE}/src/catalog/membershipDefinition.ts`,
    ]
      .map((file) => read(file))
      .join('\n');
    const usedKeys = uniqueSorted(
      [...sources.matchAll(/\bt\(\s*'([a-zA-Z][a-zA-Z0-9_.]+)'/gu)].map(
        (match) => `cloudrouter.console.membership.${match[1]}`,
      ),
    );
    assert.ok(usedKeys.length > 80, 'the surfaces use the localized copy catalog');
    for (const key of usedKeys) {
      assert.ok(zhKeys.includes(key), `zh-CN copy exists for ${key}`);
      assert.ok(enKeys.includes(key), `en-US copy exists for ${key}`);
    }
  });
});

const PC_TEAM_DIR = path.resolve(
  REPO,
  '../sdkwork-membership/apps/sdkwork-membership-pc/packages/sdkwork-membership-pc-subscription/src/team',
);

function readPcTeam(file) {
  const target = path.join(PC_TEAM_DIR, file);
  assert.ok(fs.existsSync(target), `PC team source is required for parity: ${target}`);
  return fs.readFileSync(target, 'utf8');
}

function parseQuotedList(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert.ok(start >= 0, `missing ${startToken}`);
  const end = source.indexOf(endToken, start);
  return [...source.slice(start, end).matchAll(/['"]([a-z][a-z0-9_]+)['"]/gu)]
    .map((match) => match[1]);
}

describe('H5 team membership parity with the PC token-plan team surface', () => {
  const pcPort = readPcTeam('team-subscription-port.ts');
  const pcPricing = readPcTeam('team-plan-pricing.ts');
  const pcComposition = readPcTeam('team-roster-composition.ts');
  const h5Contract = read(`${MEMBERSHIP_PACKAGE}/src/team/teamContract.ts`);
  const h5Pricing = read(`${MEMBERSHIP_PACKAGE}/src/team/teamPricing.ts`);
  const h5Runtime = read(`${MEMBERSHIP_PACKAGE}/src/runtime.ts`);
  const pcCloudRouterPort = fs.readFileSync(
    path.resolve(REPO, 'apps/sdkwork-cloudrouter-pc/src/token-plan/team/cloudRouterTeamSubscriptionPort.ts'),
    'utf8',
  );

  it('keeps the same machine-readable error vocabulary as the PC port', () => {
    const pcReasons = uniqueSorted(
      parseQuotedList(pcPort, 'SDKWORK_TEAM_ERROR_REASONS', '] as const'),
    );
    const h5Reasons = uniqueSorted(parseQuotedList(h5Contract, 'TEAM_ERROR_REASONS', '] as const'));
    assert.deepEqual(h5Reasons, pcReasons);
    assert.ok(h5Reasons.includes('organization_scope_required'));
    assert.ok(h5Reasons.includes('team_organization_already_subscribed'));
  });

  it('uses the same seat bounds, total, and add-seat defaults', () => {
    // Seat total: unit price × seats rounded to cents.
    assert.match(pcPricing, /Math\.round\(price \* seats \* 100\) \/ 100/u);
    assert.match(h5Pricing, /Math\.round\(unitPrice \* seats \* 100\) \/ 100/u);
    // Bounds: min floors at 1 and max never falls below min.
    assert.match(pcPricing, /Math\.max\(FALLBACK_SEAT_MIN, toPositiveInteger\(pkg\?\.seatMin/u);
    assert.match(h5Pricing, /Math\.max\(1, toPositiveInteger\(pkg\.seatMin, 1\)\)/u);
    // Add-seat floor/default: 1 minimum, 5 default, never the current total.
    assert.match(pcPricing, /ADDITIONAL_SEAT_DEFAULT = 5/u);
    assert.match(h5Pricing, /Math\.max\(5, bounds\.min\)/u);
    assert.match(pcPricing, /min: ADDITIONAL_SEAT_MIN/u);
    assert.match(h5Pricing, /min: 1/u);
  });

  it('keeps the int64 package-id round-trip guard before checkout', () => {
    for (const source of [pcPort, h5Contract]) {
      assert.match(source, /Number\.isSafeInteger\(numeric\)/u);
      assert.match(source, /String\(numeric\) !== normalized/u);
    }
    assert.ok(h5Runtime.includes('readTeamPackageNumericId(input.packageId)'));
  });

  it('sends the same checkout action and seat quantity as the PC port', () => {
    assert.match(pcCloudRouterPort, /quantity: input\.seats/u);
    assert.match(h5Runtime, /quantity: input\.seats/u);
    assert.match(pcCloudRouterPort, /action: input\.action/u);
    assert.match(pcCloudRouterPort, /paymentProduct: 'mobile_cashier_h5'/u);
    assert.ok(h5Runtime.includes('services.membershipCheckout.createCheckout'));
    assert.ok(
      read(`${MEMBERSHIP_PACKAGE}/src/components/TeamPlanCards.tsx`).includes(
        "action: mode === 'expand' ? 'add_seats' : 'purchase'",
      ),
      'the mobile plan cards map expand → add_seats and subscribe → purchase',
    );
  });

  it('composes seats against the IAM roster the same way as the PC surface', () => {
    assert.ok(pcComposition.includes('joinTeamSeatDirectory'));
    assert.ok(pcComposition.includes('composeTeamSeatComposition'));
    assert.ok(h5Contract.includes('joinTeamSeatDirectory'));
    assert.ok(h5Contract.includes('composeTeamSeatComposition'));
    // Only roster members count as licensed; over-seat comes from the ledger delta.
    for (const source of [pcComposition, h5Contract]) {
      assert.match(source, /seatsUsed - .*seatsPurchased/u);
    }
  });

  it('exposes the complete team flow on the H5 membership surface', () => {
    const screen = read(`${MEMBERSHIP_PACKAGE}/src/screens/MembershipScreen.tsx`);
    assert.ok(screen.includes('TeamMembershipSurface'));
    assert.ok(screen.includes('audience.team'));
    const surface = read(`${MEMBERSHIP_PACKAGE}/src/components/TeamMembershipSurface.tsx`);
    for (const token of [
      'TeamPlanCards',
      'TeamSeatManagement',
      'team.bind.title',
      'team.organization.switch',
      'team.overview.purchasedSeats',
      'team.overview.assignedSeats',
      'team.overview.availableSeats',
      'team.overview.members',
      'team.status.active',
    ]) {
      assert.ok(surface.includes(token), `team surface composes ${token}`);
    }
    const seats = read(`${MEMBERSHIP_PACKAGE}/src/components/TeamSeatManagement.tsx`);
    for (const token of [
      'team.policy.autoAssign',
      'team.seats.reconcile',
      'team.seats.assign',
      'team.confirm.revokeTitle',
    ]) {
      assert.ok(seats.includes(token), `seat management composes ${token}`);
    }
    const runtime = read(`${MEMBERSHIP_PACKAGE}/src/runtime.ts`);
    for (const call of [
      'memberships.teamSubscription.retrieve',
      'memberships.teamSubscription.bind',
      'memberships.teamSeats.list',
      'memberships.teamSeats.create',
      'memberships.teamSeats.delete',
      'memberships.teamSeats.policy.update',
      'memberships.teamSeats.reconcile',
      'iam.organizationMemberships.list',
      'iam.organizations.members.list',
      'iam.organizations.list',
      'iam.organizations.tree.retrieve',
    ]) {
      assert.ok(runtime.includes(call), `team runtime calls ${call}`);
    }
    const core = read('packages/sdkwork-cloudrouter-h5-core/src/sdk/commerceServices.ts');
    assert.ok(core.includes('createMembershipAppTransportClient'));
    assert.ok(core.includes('createIamAppClient'));
    assert.ok(core.includes('auth.sessions.current.update'));
  });

  it('covers the PC token-plan edge states the audit flagged', () => {
    // No-org sessions still get the organization chooser instead of a dead end.
    const hook = read(`${MEMBERSHIP_PACKAGE}/src/team/useTeamMembership.ts`);
    assert.ok(hook.includes("'organization_scope_required'"));
    assert.ok(hook.includes('loadTeamOrganizationDirectory'));
    // Bind is attempted directly first; the session only rotates on a scope error.
    assert.ok(hook.includes('needsOrganizationScope'));
    assert.ok(/bound = await bind\(\);/u.test(hook));
    // The single-month cycle is the PC default.
    const screen = read(`${MEMBERSHIP_PACKAGE}/src/screens/MembershipScreen.tsx`);
    assert.ok(screen.includes("=== 'once'"));
    // Super tier fallback stays visible when rank-4 benefits are unseeded.
    assert.ok(
      read(`${MEMBERSHIP_PACKAGE}/src/catalog/membershipDefinition.ts`).includes('superMonthly'),
    );
    // Redemption is idempotent and carries the grant detail.
    const runtime = read(`${MEMBERSHIP_PACKAGE}/src/runtime.ts`);
    assert.ok(runtime.includes('redeem(code, idempotencyKey)'));
    assert.ok(runtime.includes('totalQuota'));
    assert.ok(screen.includes('createMembershipOperationKey'));
    // Recharge keeps the load error, retry, custom amount, and agreement gate.
    const sheets = read(`${MEMBERSHIP_PACKAGE}/src/components/CommerceSheets.tsx`);
    for (const token of [
      'recharge.retry',
      'recharge.customMode',
      'recharge.agreement',
      'parseCustomRechargeAmount',
      'loadRechargeSettings',
    ]) {
      assert.ok(sheets.includes(token) || runtime.includes(token), `recharge composes ${token}`);
    }
    // Seat points are membership points with a period, not compute credits.
    const cards = read(`${MEMBERSHIP_PACKAGE}/src/components/TeamPlanCards.tsx`);
    assert.ok(cards.includes('会员积分'));
    assert.ok(cards.includes('resolveTeamPeriodLabel(cycle, t)'));
    // Reconcile feedback reports the revoked count.
    assert.ok(
      read(`${MEMBERSHIP_PACKAGE}/src/components/TeamSeatManagement.tsx`).includes('revokedCount'),
    );
  });
});
