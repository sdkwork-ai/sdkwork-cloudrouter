import {
  isRecord,
  normalizeRechargeSettings,
  normalizeCurrencyCode,
  readRequiredApiItem,
  readRequiredApiItems,
  readString,
  readMediaResource,
  type ClawRouterMediaResource,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

type BackendMembershipsService = ReturnType<typeof getClawRouterBackendSdkClient>['memberships'];
type BackendRechargesService = ReturnType<typeof getClawRouterBackendSdkClient>['recharges'];
type RechargeSettingsUpdateInput = Parameters<BackendRechargesService['settings']['update']>[0];

export type MembershipsAdminRecord = ApiRecord;

export interface MembershipsAdminPackageGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  planId?: string;
  billingCycle: string;
  durationDays: number;
  sortWeight: number;
  status: string;
  packageCount: number;
}

export interface MembershipsAdminPackageItem {
  id: string;
  packageNo: string;
  groupId: string;
  planId: string;
  skuId: string;
  name: string;
  priceAmount: string;
  currencyCode: string;
  durationDays: number;
  recurrenceCycle: string;
  status: string;
}

export interface MembershipsAdminPlanItem {
  id: string;
  planNo: string;
  levelCode: string;
  name: string;
  rank: number;
  status: string;
  benefitCount: number;
  benefits: MembershipsAdminPlanBenefitInput[];
  updatedAt: string;
}

export interface MembershipsAdminRechargePackageItem {
  id: string;
  packageNo: string;
  name: string;
  skuId: string;
  priceAmount: string;
  currencyCode: string;
  bonusPoints: number;
  grantAmount: number;
  points: number;
  status: string;
  updatedAt: string;
}

export interface MembershipsAdminRechargePackageMutationInput {
  priceAmount: string;
  currencyCode: string;
  bonusPoints: number;
  status?: 'active' | 'inactive';
}

export interface MembershipsAdminRechargeSettingsItem {
  baseCurrencyCode: string;
  basePointsPerCny: string;
  currencyToCnyRates: Record<string, string>;
}

export interface MembershipsAdminRechargeSettingsUpdateInput {
  baseCurrencyCode: string;
  basePointsPerCny: string;
  currencyToCnyRates: Record<string, string>;
}

export interface MembershipsAdminPlanBenefitInput {
  id?: number;
  name: string;
  benefitKey?: string;
  type?: string;
  description?: string;
  icon?: ClawRouterMediaResource;
  usageLimit?: number;
  usedCount?: number;
  claimed?: boolean;
}

export interface MembershipsAdminPlanMutationInput {
  code: string;
  name: string;
  rank?: number;
  status?: 'active' | 'inactive' | 'disabled';
  benefits?: MembershipsAdminPlanBenefitInput[];
}

export interface MembershipsAdminPlanCreateInput {
  code: string;
  name: string;
  rank?: number;
  status?: 'active' | 'inactive' | 'disabled';
  benefits?: MembershipsAdminPlanBenefitInput[];
}

export interface MembershipsAdminPackageGroupMutationInput {
  code: string;
  name: string;
  description?: string;
  billingCycle: string;
  durationDays: number;
  sortWeight?: number;
  status?: 'active' | 'inactive' | 'disabled';
}

export interface MembershipsAdminPackageMutationInput {
  code: string;
  packageGroupId: string;
  planId: string;
  name: string;
  priceAmount: string;
  currencyCode?: string;
  durationDays: number;
  status?: 'active' | 'inactive' | 'disabled';
}

export interface MembershipsAdminMembersListParams {
  userId?: string;
  planId?: string;
  status?: string;
}

export interface MembershipsAdminEntitlementsListParams {
  membershipId?: string;
  planId?: string;
  status?: string;
}

export interface MembershipsAdminPackagesListParams {
  packageGroupId?: string;
  planId?: string;
  status?: string;
}

export type MembershipsAdminMemberStatus = 'active' | 'inactive' | 'expired' | 'suspended' | 'cancelled';

export interface MembershipsAdminMemberStatusInput {
  status: MembershipsAdminMemberStatus;
}

export interface MembershipsAdminPackageCatalog {
  groups: MembershipsAdminPackageGroup[];
  packages: MembershipsAdminPackageItem[];
  plans: MembershipsAdminPlanItem[];
}

export type MembershipPackageGroupMoveDirection = 'up' | 'down';

export function sortMembershipAdminPackageGroups(
  groups: MembershipsAdminPackageGroup[],
): MembershipsAdminPackageGroup[] {
  return [...groups].sort(compareMembershipAdminPackageGroups);
}

export function moveMembershipAdminPackageGroup(
  groups: MembershipsAdminPackageGroup[],
  packageGroupId: string,
  direction: MembershipPackageGroupMoveDirection,
): MembershipsAdminPackageGroup[] {
  const sortedGroups = sortMembershipAdminPackageGroups(groups);
  const currentIndex = sortedGroups.findIndex((group) => group.id === packageGroupId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedGroups.length) {
    return sortedGroups;
  }

  const reorderedGroups = [...sortedGroups];
  const [movedGroup] = reorderedGroups.splice(currentIndex, 1);
  if (!movedGroup) {
    return sortedGroups;
  }
  reorderedGroups.splice(targetIndex, 0, movedGroup);
  return reorderedGroups.map((group, index) => ({
    ...group,
    sortWeight: (index + 1) * 10,
  }));
}

export async function backendMembershipsPlansList(params?: Parameters<BackendMembershipsService['plans']['management']['list']>[0]) {
  return getClawRouterBackendSdkClient().memberships.plans.management.list(params);
}

export async function backendMembershipsPlansCreate(
  body: Parameters<BackendMembershipsService['plans']['create']>[0],
) {
  return getClawRouterBackendSdkClient().memberships.plans.create(body);
}

export async function backendMembershipsPlansUpdate(
  planId: string,
  body: Parameters<BackendMembershipsService['plans']['update']>[1],
) {
  return getClawRouterBackendSdkClient().memberships.plans.update(
    planId,
    body,
  );
}

export async function backendMembershipsPackageGroupsList(params?: Parameters<BackendMembershipsService['packageGroups']['management']['list']>[0]) {
  return getClawRouterBackendSdkClient().memberships.packageGroups.management.list(params);
}

export async function backendMembershipsPackageGroupsCreate(
  body: Parameters<BackendMembershipsService['packageGroups']['create']>[0],
) {
  return getClawRouterBackendSdkClient().memberships.packageGroups.create(body);
}

export async function backendMembershipsPackageGroupsUpdate(
  packageGroupId: string,
  body: Parameters<BackendMembershipsService['packageGroups']['update']>[1],
) {
  return getClawRouterBackendSdkClient().memberships.packageGroups.update(
    packageGroupId,
    body,
  );
}

export async function backendMembershipsPackageGroupsDelete(
  packageGroupId: string,
) {
  return getClawRouterBackendSdkClient().memberships.packageGroups.delete(
    packageGroupId,
  );
}

export async function backendMembershipsPackagesList(params?: Parameters<BackendMembershipsService['packages']['management']['list']>[0]) {
  return getClawRouterBackendSdkClient().memberships.packages.management.list(params);
}

export async function backendMembershipsPackagesCreate(
  body: Parameters<BackendMembershipsService['packages']['create']>[0],
) {
  return getClawRouterBackendSdkClient().memberships.packages.create(body);
}

export async function backendMembershipsPackagesUpdate(
  packageId: string,
  body: Parameters<BackendMembershipsService['packages']['update']>[1],
) {
  return getClawRouterBackendSdkClient().memberships.packages.update(
    packageId,
    body,
  );
}

export async function backendMembershipsPackagesDelete(
  packageId: string,
) {
  return getClawRouterBackendSdkClient().memberships.packages.delete(
    packageId,
  );
}

export async function backendMembershipsMembersList(params?: Parameters<BackendMembershipsService['members']['list']>[0]) {
  return getClawRouterBackendSdkClient().memberships.members.list(params);
}

export async function backendMembershipsMembersStatusUpdate(
  membershipId: string,
  body: Parameters<BackendMembershipsService['members']['update']>[1],
) {
  return getClawRouterBackendSdkClient().memberships.members.update(
    membershipId,
    body,
  );
}

export async function backendMembershipsEntitlementsList(params?: Parameters<BackendMembershipsService['entitlements']['list']>[0]) {
  return getClawRouterBackendSdkClient().memberships.entitlements.list(params);
}

export async function backendMembershipsRechargePackagesList(params?: Parameters<BackendRechargesService['packages']['management']['list']>[0]) {
  return getClawRouterBackendSdkClient().recharges.packages.management.list(params);
}

export async function backendMembershipsRechargePackagesCreate(
  body: Parameters<BackendRechargesService['packages']['create']>[0],
) {
  return getClawRouterBackendSdkClient().recharges.packages.create(body);
}

export async function backendMembershipsRechargePackagesUpdate(
  packageId: string,
  body: Parameters<BackendRechargesService['packages']['update']>[1],
) {
  return getClawRouterBackendSdkClient().recharges.packages.update(
    packageId,
    body,
  );
}

export async function backendMembershipsRechargePackagesDelete(
  packageId: string,
) {
  return getClawRouterBackendSdkClient().recharges.packages.delete(
    packageId,
  );
}

export async function backendMembershipsRechargeSettingsRetrieve() {
  return getClawRouterBackendSdkClient().recharges.settings.management.retrieve();
}

export async function backendMembershipsRechargeSettingsUpdate(
  body: Parameters<BackendRechargesService['settings']['update']>[0],
) {
  return getClawRouterBackendSdkClient().recharges.settings.update(body);
}

export async function fetchMembershipAdminPackageCatalog(): Promise<MembershipsAdminPackageCatalog> {
  const [packagesResult, groupsResult, plansResult] = await Promise.all([
    backendMembershipsPackagesList(),
    backendMembershipsPackageGroupsList(),
    backendMembershipsPlansList(),
  ]);

  const rawPackages = readRequiredApiItems(packagesResult, 'Membership packages could not be loaded');
  const normalizedPackages = rawPackages.map(normalizeAdminPackage);
  const groupMap = new Map<string, MembershipsAdminPackageGroup>();

  readRequiredApiItems(groupsResult, 'Membership package groups could not be loaded')
    .map(normalizeAdminPackageGroup)
    .forEach((group) => {
      groupMap.set(group.id, group);
    });

  normalizedPackages.forEach((pkg) => {
    const group = groupMap.get(pkg.groupId);
    if (group) {
      group.packageCount++;
    }
  });

  const groups = sortMembershipAdminPackageGroups(Array.from(groupMap.values()));
  const rawPlans = readRequiredApiItems(plansResult, 'Membership plans could not be loaded');
  return {
    groups,
    packages: normalizedPackages,
    plans: rawPlans.map(normalizeAdminPlan),
  };
}

export async function fetchMembershipAdminPackageGroups(): Promise<MembershipsAdminPackageGroup[]> {
  const [groupsResult, packagesResult] = await Promise.all([
    backendMembershipsPackageGroupsList(),
    backendMembershipsPackagesList(),
  ]);
  const groups = readRequiredApiItems(groupsResult, 'Membership package groups could not be loaded')
    .map(normalizeAdminPackageGroup);
  const packageCounts = new Map<string, number>();
  readRequiredApiItems(packagesResult, 'Membership packages could not be loaded')
    .map(normalizeAdminPackage)
    .forEach((pkg) => {
      packageCounts.set(pkg.groupId, (packageCounts.get(pkg.groupId) ?? 0) + 1);
    });
  return sortMembershipAdminPackageGroups(groups.map((group) => ({
    ...group,
    packageCount: packageCounts.get(group.id) ?? 0,
  })));
}

export async function createMembershipAdminPackageGroup(
  input: MembershipsAdminPackageGroupMutationInput,
): Promise<MembershipsAdminPackageGroup> {
  const result = await backendMembershipsPackageGroupsCreate(
    buildPackageGroupMutationRequest(input),
  );
  return normalizeAdminPackageGroup(readRequiredApiItem(result, 'Membership package group could not be created'));
}

export async function updateMembershipAdminPackageGroup(
  packageGroupId: string,
  input: MembershipsAdminPackageGroupMutationInput,
): Promise<MembershipsAdminPackageGroup> {
  const result = await backendMembershipsPackageGroupsUpdate(
    requiredMembershipText(packageGroupId, 'packageGroupId'),
    buildPackageGroupMutationRequest(input),
  );
  return normalizeAdminPackageGroup(readRequiredApiItem(result, 'Membership package group could not be updated'));
}

export async function deleteMembershipAdminPackageGroup(packageGroupId: string): Promise<void> {
  await backendMembershipsPackageGroupsDelete(
    requiredMembershipText(packageGroupId, 'packageGroupId'),
  );
}

export async function fetchMembershipAdminPackages(
  params: MembershipsAdminPackagesListParams = {},
): Promise<MembershipsAdminPackageItem[]> {
  const result = await backendMembershipsPackagesList({
    planId: params.planId,
    status: params.status,
  });
  const packages = readRequiredApiItems(result, 'Membership packages could not be loaded').map(normalizeAdminPackage);
  if (!params.packageGroupId) {
    return packages;
  }
  return packages.filter((item) => item.groupId === params.packageGroupId);
}

export async function createMembershipAdminPackage(
  input: MembershipsAdminPackageMutationInput,
): Promise<MembershipsAdminPackageItem> {
  const result = await backendMembershipsPackagesCreate(
    buildPackageMutationRequest(input),
  );
  return normalizeAdminPackage(readRequiredApiItem(result, 'Membership package could not be created'));
}

export async function updateMembershipAdminPackage(
  packageId: string,
  input: MembershipsAdminPackageMutationInput,
): Promise<MembershipsAdminPackageItem> {
  const result = await backendMembershipsPackagesUpdate(
    requiredMembershipText(packageId, 'packageId'),
    buildPackageMutationRequest(input),
  );
  return normalizeAdminPackage(readRequiredApiItem(result, 'Membership package could not be updated'));
}

export async function deleteMembershipAdminPackage(packageId: string): Promise<void> {
  await backendMembershipsPackagesDelete(
    requiredMembershipText(packageId, 'packageId'),
  );
}

export async function fetchMembershipAdminPlans(): Promise<MembershipsAdminPlanItem[]> {
  const result = await backendMembershipsPlansList();
  return readRequiredApiItems(result, 'Membership plans could not be loaded').map(normalizeAdminPlan);
}

export async function createMembershipAdminPlan(input: MembershipsAdminPlanCreateInput): Promise<MembershipsAdminPlanItem> {
  const result = await backendMembershipsPlansCreate(
    buildPlanMutationRequest(input),
  );
  return normalizeAdminPlan(readRequiredApiItem(result, 'Membership plan could not be created'));
}

export async function updateMembershipAdminPlan(
  planId: string,
  input: MembershipsAdminPlanMutationInput,
): Promise<MembershipsAdminPlanItem> {
  const result = await backendMembershipsPlansUpdate(
    requiredMembershipText(planId, 'planId'),
    buildPlanMutationRequest(input),
  );
  return normalizeAdminPlan(readRequiredApiItem(result, 'Membership plan could not be updated'));
}

export async function fetchMembershipAdminMembers(
  params: MembershipsAdminMembersListParams = {},
): Promise<MembershipsAdminRecord[]> {
  const result = await backendMembershipsMembersList({
    page: 1,
    pageSize: 100,
    userId: params.userId,
    planId: params.planId,
    status: params.status,
  });
  return readRequiredApiItems(result, 'Members could not be loaded') as MembershipsAdminRecord[];
}

export async function updateMembershipAdminMemberStatus(
  membershipId: string,
  input: MembershipsAdminMemberStatusInput,
): Promise<MembershipsAdminRecord> {
  const result = await backendMembershipsMembersStatusUpdate(
    requiredMembershipText(membershipId, 'membershipId'),
    { status: requiredMembershipMemberStatus(input.status) },
  );
  return readRequiredApiItem(result, 'Membership status could not be updated');
}

export async function fetchMembershipAdminEntitlements(
  params: MembershipsAdminEntitlementsListParams = {},
): Promise<MembershipsAdminRecord[]> {
  const result = await backendMembershipsEntitlementsList({
    page: 1,
    pageSize: 100,
    membershipId: params.membershipId,
    planId: params.planId,
    status: params.status,
  });
  return readRequiredApiItems(result, 'Entitlements could not be loaded') as MembershipsAdminRecord[];
}

export async function fetchMembershipAdminRechargePackages(): Promise<MembershipsAdminRechargePackageItem[]> {
  const result = await backendMembershipsRechargePackagesList();
  return readRequiredApiItems(result, 'Recharge packages could not be loaded').map(normalizeAdminRechargePackage);
}

export async function createMembershipAdminRechargePackage(
  input: MembershipsAdminRechargePackageMutationInput,
): Promise<MembershipsAdminRechargePackageItem> {
  const result = await backendMembershipsRechargePackagesCreate(
    buildRechargePackageMutationRequest(input),
  );
  return normalizeAdminRechargePackage(readRequiredApiItem(result, 'Recharge package could not be created'));
}

export async function updateMembershipAdminRechargePackage(
  packageId: string,
  input: MembershipsAdminRechargePackageMutationInput,
): Promise<MembershipsAdminRechargePackageItem> {
  const result = await backendMembershipsRechargePackagesUpdate(
    requiredMembershipText(packageId, 'packageId'),
    buildRechargePackageMutationRequest(input),
  );
  return normalizeAdminRechargePackage(readRequiredApiItem(result, 'Recharge package could not be updated'));
}

export async function deleteMembershipAdminRechargePackage(packageId: string): Promise<void> {
  await backendMembershipsRechargePackagesDelete(
    requiredMembershipText(packageId, 'packageId'),
  );
}

export async function fetchMembershipAdminRechargeSettings(): Promise<MembershipsAdminRechargeSettingsItem> {
  const result = await backendMembershipsRechargeSettingsRetrieve();
  return normalizeAdminRechargeSettings(readRequiredApiItem(result, 'Recharge settings could not be loaded'));
}

export async function updateMembershipAdminRechargeSettings(
  input: MembershipsAdminRechargeSettingsUpdateInput,
): Promise<MembershipsAdminRechargeSettingsItem> {
  const result = await backendMembershipsRechargeSettingsUpdate(
    buildRechargeSettingsUpdateRequest(input),
  );
  return normalizeAdminRechargeSettings(readRequiredApiItem(result, 'Recharge settings could not be updated'));
}

function normalizeAdminPackage(value: unknown): MembershipsAdminPackageItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const code = requireRecordString(item, 'code', 'Membership package code is required');
  const durationDays = readNumber(item, 'durationDays', 30);
  return {
    id: requireRecordString(item, 'id', 'Membership package id is required'),
    packageNo: code,
    groupId: requireRecordString(item, 'packageGroupId', 'Membership package group id is required'),
    planId: requireRecordString(item, 'planId', 'Membership package plan id is required'),
    skuId: readString(item, 'skuId').trim(),
    name: requireRecordString(item, 'name', 'Membership package name is required'),
    priceAmount: readString(item, 'priceAmount').trim() || '0',
    currencyCode: readString(item, 'currencyCode').trim() || 'CNY',
    durationDays,
    recurrenceCycle: readString(item, 'recurrenceCycle').trim() || inferAdminBillingCycle(durationDays),
    status: readString(item, 'status') || 'active',
  };
}

function normalizeAdminPackageGroup(value: unknown): MembershipsAdminPackageGroup {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const code = requireRecordString(item, 'code', 'Membership package group code is required');
  const billingCycle = readString(item, 'billingCycle').trim();
  const durationDays = readNumber(item, 'durationDays', inferDurationFromBillingCycle(billingCycle));
  return {
    id: requireRecordString(item, 'id', 'Membership package group id is required'),
    code,
    name: requireRecordString(item, 'name', 'Membership package group name is required'),
    description: readString(item, 'description').trim() || undefined,
    planId: readString(item, 'planId').trim() || undefined,
    billingCycle: billingCycle || inferAdminBillingCycle(durationDays),
    durationDays,
    sortWeight: readNumber(item, 'sortWeight', 0),
    status: readString(item, 'status').trim() || 'active',
    packageCount: readNumber(item, 'packageCount', 0),
  };
}

function compareMembershipAdminPackageGroups(
  left: MembershipsAdminPackageGroup,
  right: MembershipsAdminPackageGroup,
): number {
  const weightComparison = left.sortWeight - right.sortWeight;
  if (weightComparison !== 0) {
    return weightComparison;
  }

  const nameComparison = left.name.localeCompare(right.name);
  if (nameComparison !== 0) {
    return nameComparison;
  }

  const codeComparison = left.code.localeCompare(right.code);
  if (codeComparison !== 0) {
    return codeComparison;
  }

  return left.id.localeCompare(right.id);
}

function normalizeAdminRechargePackage(value: unknown): MembershipsAdminRechargePackageItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const id = requireRecordString(item, 'id', 'Recharge package id is required');
  const bonusPoints = readNumber(item, 'bonusPoints', 0);
  const grantAmount = readNumber(item, 'grantAmount', readNumber(item, 'points', 0));
  return {
    id,
    packageNo: readString(item, 'packageNo').trim() || id,
    name: readString(item, 'name').trim() || id,
    skuId: readString(item, 'skuId').trim(),
    priceAmount: readString(item, 'priceAmount').trim() || '0',
    currencyCode: readString(item, 'currencyCode').trim() || 'CNY',
    bonusPoints,
    grantAmount,
    points: readNumber(item, 'points', grantAmount),
    status: readString(item, 'status').trim() || 'active',
    updatedAt: readString(item, 'updatedAt').trim(),
  };
}

function normalizeAdminRechargeSettings(value: unknown): MembershipsAdminRechargeSettingsItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const currencyToCnyRates = readRecord(item, 'currencyToCnyRates');
  return normalizeRechargeSettings({
    baseCurrencyCode: readString(item, 'baseCurrencyCode').trim() || 'CNY',
    basePointsPerCny: readString(item, 'basePointsPerCny').trim() || '10',
    currencyToCnyRates: Object.fromEntries(
      Object.entries(currencyToCnyRates).map(([currencyCode, rate]) => [currencyCode, String(rate ?? '')]),
    ),
  });
}

function normalizeAdminPlan(value: unknown): MembershipsAdminPlanItem {
  const item = isRecord(value) ? value as ApiRecord : {} as ApiRecord;
  const rawBenefits = readBenefitArray(item);
  const benefits = rawBenefits.map(normalizeAdminPlanBenefit);
  const rank = readNumber(item, 'rank', 0);
  const code = requireRecordString(item, 'code', 'Membership plan code is required');
  return {
    id: requireRecordString(item, 'id', 'Membership plan id is required'),
    planNo: code,
    levelCode: code,
    name: requireRecordString(item, 'name', 'Membership plan name is required'),
    rank,
    status: readString(item, 'status') || 'active',
    benefitCount: benefits.length,
    benefits,
    updatedAt: readString(item, 'updatedAt').trim(),
  };
}

function requiredMembershipText(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function requiredMembershipCode(value: string | undefined, fieldName: string): string {
  const normalized = requiredMembershipText(value, fieldName);
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error(`${fieldName} may only contain letters, numbers, -, and _`);
  }
  return normalized;
}

function requiredPositiveInteger(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value;
}

function requiredNonNegativeInteger(value: number | undefined, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
}

function requiredPositiveInt64String(value: number | undefined, fieldName: string): string {
  return String(requiredPositiveInteger(value, fieldName));
}

function requiredNonNegativeInt64String(value: number | undefined, fieldName: string): string {
  return String(requiredNonNegativeInteger(value, fieldName));
}

function optionalNonNegativeInt64String(value: number | undefined, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredNonNegativeInt64String(value, fieldName);
}

function requiredMoneyAmount(value: string | undefined, fieldName: string): string {
  const normalized = requiredMembershipText(value, fieldName);
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${fieldName} must be a valid amount`);
  }
  return normalized;
}

function requiredResourceStatus(value: string | undefined, fieldName: string): 'active' | 'inactive' | 'disabled' {
  const status = (value ?? 'active').trim().toLowerCase();
  if (status === 'active' || status === 'inactive' || status === 'disabled') {
    return status;
  }
  throw new Error(`${fieldName} must be active, inactive, or disabled`);
}

function requiredMembershipMemberStatus(value: string | undefined): MembershipsAdminMemberStatus {
  const status = requiredMembershipText(value, 'status').toLowerCase();
  if (
    status === 'active'
    || status === 'inactive'
    || status === 'expired'
    || status === 'suspended'
    || status === 'cancelled'
  ) {
    return status;
  }
  throw new Error('status must be active, inactive, expired, suspended, or cancelled');
}

function buildPlanMutationRequest(input: MembershipsAdminPlanMutationInput) {
  const rank = optionalNonNegativeInt64String(input.rank, 'rank');
  return {
    code: requiredMembershipCode(input.code, 'code'),
    name: requiredMembershipText(input.name, 'name'),
    rank,
    status: requiredResourceStatus(input.status, 'status'),
    benefits: (input.benefits ?? []).map(buildPlanBenefitMutationRequest),
  };
}

function buildPlanBenefitMutationRequest(input: MembershipsAdminPlanBenefitInput) {
  return {
    id: optionalNonNegativeInt64String(input.id, 'benefit id'),
    name: requiredMembershipText(input.name, 'benefit name'),
    benefitKey: optionalBoundedText(input.benefitKey),
    type: optionalBoundedText(input.type),
    description: optionalBoundedText(input.description),
    icon: input.icon,
    usageLimit: optionalNonNegativeInt64String(input.usageLimit, 'usageLimit'),
    usedCount: optionalNonNegativeInt64String(input.usedCount, 'usedCount'),
    claimed: input.claimed ?? false,
  };
}

function buildPackageGroupMutationRequest(input: MembershipsAdminPackageGroupMutationInput) {
  return {
    code: requiredMembershipCode(input.code, 'code'),
    name: requiredMembershipText(input.name, 'name'),
    description: optionalBoundedText(input.description),
    billingCycle: requiredMembershipText(input.billingCycle, 'billingCycle'),
    durationDays: requiredPositiveInt64String(input.durationDays, 'durationDays'),
    sortWeight: input.sortWeight === undefined ? '0' : requiredNonNegativeInt64String(input.sortWeight, 'sortWeight'),
    status: requiredResourceStatus(input.status, 'status'),
  };
}

function buildPackageMutationRequest(input: MembershipsAdminPackageMutationInput) {
  return {
    code: requiredMembershipCode(input.code, 'code'),
    packageGroupId: requiredMembershipText(input.packageGroupId, 'packageGroupId'),
    planId: requiredMembershipText(input.planId, 'planId'),
    name: requiredMembershipText(input.name, 'name'),
    priceAmount: requiredMoneyAmount(input.priceAmount, 'priceAmount'),
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    durationDays: requiredPositiveInt64String(input.durationDays, 'durationDays'),
    status: requiredResourceStatus(input.status, 'status'),
  };
}

function buildRechargePackageMutationRequest(
  input: MembershipsAdminRechargePackageMutationInput,
): Parameters<BackendRechargesService['packages']['create']>[0] {
  return {
    priceAmount: requiredMoneyAmount(input.priceAmount, 'priceAmount'),
    currencyCode: normalizeCurrencyCode(input.currencyCode),
    bonusPoints: requiredNonNegativeInt64String(input.bonusPoints, 'bonusPoints'),
    status: input.status ?? 'active',
  };
}

function buildRechargeSettingsUpdateRequest(
  input: MembershipsAdminRechargeSettingsUpdateInput,
): RechargeSettingsUpdateInput {
  const normalized = normalizeRechargeSettings(input);
  return {
    baseCurrencyCode: normalized.baseCurrencyCode,
    basePointsPerCny: normalized.basePointsPerCny,
    currencyToCnyRates: normalized.currencyToCnyRates,
  };
}

function optionalBoundedText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function readRecord(record: ApiRecord, key: string): ApiRecord {
  const value = record[key];
  return isRecord(value) ? value as ApiRecord : {};
}

function readNumber(record: ApiRecord, key: string, fallback: number): number {
  const raw = record[key];
  const parsed = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseInt(raw.trim(), 10)
      : Number.NaN;
  return Number.isInteger(parsed) ? parsed : fallback;
}

function requireRecordString(record: ApiRecord, key: string, message: string): string {
  const value = readString(record, key).trim();
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function readBenefitArray(item: ApiRecord): unknown[] {
  if (Array.isArray(item['benefits'])) {
    return item['benefits'];
  }
  return [];
}

function normalizeAdminPlanBenefit(value: unknown): MembershipsAdminPlanBenefitInput {
  const item = isRecord(value) ? value as ApiRecord : {};
  return {
    id: optionalInteger(item, 'id'),
    name: readString(item, 'name').trim(),
    benefitKey: readString(item, 'benefitKey').trim() || undefined,
    type: readString(item, 'type').trim() || undefined,
    description: readString(item, 'description').trim() || undefined,
    icon: readMediaResource(item['icon']),
    usageLimit: optionalInteger(item, 'usageLimit'),
    usedCount: optionalInteger(item, 'usedCount'),
    claimed: typeof item['claimed'] === 'boolean' ? item['claimed'] : undefined,
  };
}

function optionalInteger(record: ApiRecord, key: string): number | undefined {
  const value = record[key];
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseInt(value.trim(), 10)
      : Number.NaN;
  if (Number.isInteger(parsed)) {
    return parsed;
  }
  return undefined;
}

function inferAdminBillingCycle(durationDays: number): string {
  if (durationDays >= 360) return 'year';
  if (durationDays >= 25 && durationDays <= 35) return 'month';
  if (durationDays === 7) return 'week';
  if (durationDays === 1) return 'day';
  return 'one_time';
}

function inferDurationFromBillingCycle(billingCycle: string): number {
  const normalized = billingCycle.trim().toLowerCase();
  if (normalized.includes('year')) return 365;
  if (normalized.includes('month')) return 30;
  if (normalized.includes('week')) return 7;
  if (normalized.includes('day')) return 1;
  return 30;
}
