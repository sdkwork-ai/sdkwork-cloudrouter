import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampTeamSeatCount,
  computeTeamSeatTotal,
  formatTeamCnyAmount,
  groupTeamPlanPackages,
  parseTeamSeatInput,
  resolveDefaultTeamSeatCount,
  resolveTeamSeatBounds,
  selectTeamPlanPackage,
  type TeamBillingCycle,
  type TeamPlanPackageLike,
} from './src/token-plan/team/teamPlanPricing.ts';

function teamPackage(overrides: Partial<TeamPlanPackageLike> & Pick<TeamPlanPackageLike, 'id' | 'planId'>): TeamPlanPackageLike {
  return {
    name: `Package ${overrides.id}`,
    planName: `Plan ${overrides.planId}`,
    planRank: '1',
    recurrenceCycle: 'month',
    price: '69.90',
    seatMin: '3',
    seatMax: '50',
    seatPointsAmount: '0',
    recommended: false,
    sortWeight: '0',
    ...overrides,
  };
}

const SEAT_BOUNDS = { max: 100, min: 3 };

test('team seat total is unit price multiplied by the selected seats', () => {
  assert.equal(computeTeamSeatTotal('69.90', 3), 209.7);
  assert.equal(computeTeamSeatTotal(199, 5), 995);
  assert.equal(computeTeamSeatTotal('12.50', 4), 50);
  assert.equal(computeTeamSeatTotal('0', 3), 0);
  assert.equal(computeTeamSeatTotal('69.90', 0), 0);
  assert.equal(computeTeamSeatTotal('not-a-price', 3), 0);
});

test('team seat totals render as ¥ amounts with thousands separators', () => {
  assert.equal(formatTeamCnyAmount(computeTeamSeatTotal('69.90', 3)), '¥209.70');
  assert.equal(formatTeamCnyAmount(995), '¥995');
  assert.equal(formatTeamCnyAmount(12345.6), '¥12,345.60');
  assert.equal(formatTeamCnyAmount(0), '¥0');
});

test('seat counts clamp into the package minimum and maximum', () => {
  assert.equal(clampTeamSeatCount(1, SEAT_BOUNDS), 3);
  assert.equal(clampTeamSeatCount(3, SEAT_BOUNDS), 3);
  assert.equal(clampTeamSeatCount(42, SEAT_BOUNDS), 42);
  assert.equal(clampTeamSeatCount(7.9, SEAT_BOUNDS), 7);
  assert.equal(clampTeamSeatCount(100, SEAT_BOUNDS), 100);
  assert.equal(clampTeamSeatCount(101, SEAT_BOUNDS), 100);
  assert.equal(clampTeamSeatCount(Number.NaN, SEAT_BOUNDS), 3);
});

test('seat bounds self-heal an inverted or empty backend range', () => {
  assert.deepEqual(resolveTeamSeatBounds({ seatMax: '50', seatMin: '5' }), { max: 50, min: 5 });
  assert.deepEqual(resolveTeamSeatBounds({ seatMax: '0', seatMin: '0' }), { max: 1, min: 1 });
  assert.deepEqual(resolveTeamSeatBounds({ seatMax: '2', seatMin: '10' }), { max: 10, min: 10 });
  assert.deepEqual(resolveTeamSeatBounds(null), { max: 1, min: 1 });
});

test('expanding defaults to the larger of the plan minimum and the purchased seats', () => {
  const bounds = { max: 50, min: 5 };
  assert.equal(resolveDefaultTeamSeatCount(bounds, 0), 5);
  assert.equal(resolveDefaultTeamSeatCount(bounds, 2), 5);
  assert.equal(resolveDefaultTeamSeatCount(bounds, 8), 8);
  assert.equal(resolveDefaultTeamSeatCount(bounds, 500), 50);
});

test('stepper input falls back to the plan minimum and ignores non-digits', () => {
  assert.equal(parseTeamSeatInput('', SEAT_BOUNDS), 3);
  assert.equal(parseTeamSeatInput('12', SEAT_BOUNDS), 12);
  assert.equal(parseTeamSeatInput(' 9 ', SEAT_BOUNDS), 9);
  assert.equal(parseTeamSeatInput('abc', SEAT_BOUNDS), 3);
  assert.equal(parseTeamSeatInput('005', SEAT_BOUNDS), 5);
});

test('team plans group by planId, sorted by planRank with monthly and annual variants', () => {
  const packages = [
    teamPackage({ id: 'p3-m', planId: 'p3', planRank: '3', recurrenceCycle: 'month' }),
    teamPackage({ id: 'p1-m', planId: 'p1', planRank: '1', recurrenceCycle: 'month', recommended: true }),
    teamPackage({ id: 'p2-y', planId: 'p2', planRank: '2', recurrenceCycle: 'year', price: '699' }),
    teamPackage({ id: 'p1-y', planId: 'p1', planRank: '1', recurrenceCycle: 'year', price: '699' }),
    teamPackage({ id: 'p2-m', planId: 'p2', planRank: '2', recurrenceCycle: 'month' }),
  ];

  const groups = groupTeamPlanPackages(packages);

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.planId), ['p1', 'p2', 'p3']);
  assert.equal(groups[0]?.monthly?.id, 'p1-m');
  assert.equal(groups[0]?.annual?.id, 'p1-y');
  assert.equal(groups[0]?.recommended, true);
  assert.equal(groups[2]?.annual, null);
  assert.equal(groups[2]?.monthly?.id, 'p3-m');
});

test('monthly and annual selection prefers the requested cycle and falls back', () => {
  const groups = groupTeamPlanPackages([
    teamPackage({ id: 'm', planId: 'p1', planRank: '1', recurrenceCycle: 'month' }),
    teamPackage({ id: 'y', planId: 'p1', planRank: '1', recurrenceCycle: 'year' }),
    teamPackage({ id: 'only-m', planId: 'p2', planRank: '2', recurrenceCycle: 'month' }),
    teamPackage({ id: 'once', planId: 'p3', planRank: '3', recurrenceCycle: 'once' }),
  ]);

  const bothCycles = groups[0];
  const monthlyOnly = groups[1];
  const noCycle = groups[2];
  assert.ok(bothCycles && monthlyOnly && noCycle);

  const requested: TeamBillingCycle = 'month';
  assert.equal(selectTeamPlanPackage(bothCycles, requested)?.id, 'm');
  assert.equal(selectTeamPlanPackage(bothCycles, 'year')?.id, 'y');
  assert.equal(selectTeamPlanPackage(monthlyOnly, 'year')?.id, 'only-m');
  assert.equal(selectTeamPlanPackage(monthlyOnly, 'month')?.id, 'only-m');
  assert.equal(selectTeamPlanPackage(noCycle, 'year')?.id, 'once');
  assert.equal(selectTeamPlanPackage({ ...noCycle, packages: [] }, 'month'), null);
});
