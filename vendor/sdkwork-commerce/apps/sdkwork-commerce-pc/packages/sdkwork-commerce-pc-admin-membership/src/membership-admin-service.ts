import {
  getSdkworkCommerceService,
  hasSdkworkCommerceSession,
  requireSdkworkCommerceSession,
  unwrapSdkworkCommerceResponse,
  type SdkworkCommerceRequestParams,
  type SdkworkCommerceService,
} from "@sdkwork/commerce-service";
import {
  createSdkworkMembershipAdminMessages,
  type SdkworkMembershipAdminMessages,
  type SdkworkMembershipAdminMessagesOverrides,
} from "./membership-admin-copy";

export type SdkworkMembershipAdminStatus = "active" | "disabled" | "inactive" | "suspended" | string;

export interface SdkworkMembershipAdminLevel {
  benefits?: readonly string[];
  code: string;
  id: string;
  name: string;
  rank: number;
  status: SdkworkMembershipAdminStatus;
}

export type SdkworkMembershipAdminLevelUpdateInput = Omit<SdkworkMembershipAdminLevel, "id">;
export type SdkworkMembershipAdminLevelDeleteResult = { deleted?: boolean; levelId?: string };
export type SdkworkMembershipAdminBenefit = { id: string };

export interface SdkworkMembershipAdminPackage {
  code: string;
  currencyCode: string;
  durationDays: number;
  groupId: string;
  id: string;
  levelId: string;
  name: string;
  priceAmount: string;
  status: SdkworkMembershipAdminStatus;
}

export type SdkworkMembershipAdminPackageUpdateInput = Omit<SdkworkMembershipAdminPackage, "id">;
export type SdkworkMembershipAdminPackageDeleteResult = { deleted?: boolean; packageId?: string };

export interface SdkworkMembershipAdminPackageGroup {
  billingCycle: string;
  code: string;
  description?: string | null;
  durationDays: number;
  id: string;
  name: string;
  sortWeight: number;
  status: SdkworkMembershipAdminStatus;
}

export type SdkworkMembershipAdminPackageGroupMutationInput = Omit<SdkworkMembershipAdminPackageGroup, "id">;
export type SdkworkMembershipAdminPackageGroupDeleteResult = { deleted?: boolean; packageGroupId?: string };

export interface SdkworkMembershipAdminMembership {
  expiresAt: string;
  id: string;
  levelCode: string;
  ownerUserId: string;
  startedAt: string;
  status: SdkworkMembershipAdminStatus;
}

export interface SdkworkMembershipAdminMembershipUpdateInput {
  status: SdkworkMembershipAdminStatus;
}

export interface SdkworkMembershipAdminEntitlement {
  code: string;
  id: string;
  levelId: string;
  membershipId: string;
  quota: string;
  status: SdkworkMembershipAdminStatus;
}

export type SdkworkMembershipAdminEntitlementsListParams = SdkworkCommerceRequestParams;
export type SdkworkMembershipAdminLevelsListParams = SdkworkCommerceRequestParams;
export type SdkworkMembershipAdminMembershipsListParams = SdkworkCommerceRequestParams;
export type SdkworkMembershipAdminPackageGroupsListParams = SdkworkCommerceRequestParams;
export type SdkworkMembershipAdminPackagesListParams = SdkworkCommerceRequestParams;

export interface SdkworkMembershipAdminSummary {
  activeMemberships: number;
  enabledPackages: number;
  entitlements: number;
  levels: number;
  memberships: number;
  packageGroups: number;
  packages: number;
}

export interface SdkworkMembershipAdminDashboardData {
  entitlements: SdkworkMembershipAdminEntitlement[];
  levels: SdkworkMembershipAdminLevel[];
  memberships: SdkworkMembershipAdminMembership[];
  packageGroups: SdkworkMembershipAdminPackageGroup[];
  packages: SdkworkMembershipAdminPackage[];
  summary: SdkworkMembershipAdminSummary;
}

export interface CreateSdkworkMembershipAdminServiceOptions {
  commerceService?: SdkworkCommerceService;
  locale?: string | null;
  messages?: SdkworkMembershipAdminMessagesOverrides;
}

export interface SdkworkMembershipAdminService {
  assignPackagesToGroup(
    packages: SdkworkMembershipAdminPackage[],
    packageGroupId: string,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminPackage[]>;
  createLevel(input: SdkworkMembershipAdminLevelUpdateInput, requestParams?: SdkworkCommerceRequestParams): Promise<SdkworkMembershipAdminLevel>;
  createPackage(input: SdkworkMembershipAdminPackageUpdateInput, requestParams?: SdkworkCommerceRequestParams): Promise<SdkworkMembershipAdminPackage>;
  createPackageGroup(
    input: SdkworkMembershipAdminPackageGroupMutationInput,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminPackageGroup>;
  deleteLevel(levelId: string, requestParams?: SdkworkCommerceRequestParams): Promise<SdkworkMembershipAdminLevelDeleteResult>;
  deletePackage(packageId: string, requestParams?: SdkworkCommerceRequestParams): Promise<SdkworkMembershipAdminPackageDeleteResult>;
  deletePackageGroup(
    packageGroupId: string,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminPackageGroupDeleteResult>;
  getDashboard(): Promise<SdkworkMembershipAdminDashboardData>;
  getEmptyDashboard(): SdkworkMembershipAdminDashboardData;
  listEntitlements(params?: SdkworkMembershipAdminEntitlementsListParams): Promise<SdkworkMembershipAdminEntitlement[]>;
  listLevels(params?: SdkworkMembershipAdminLevelsListParams): Promise<SdkworkMembershipAdminLevel[]>;
  listMemberships(params?: SdkworkMembershipAdminMembershipsListParams): Promise<SdkworkMembershipAdminMembership[]>;
  listPackageGroups(params?: SdkworkMembershipAdminPackageGroupsListParams): Promise<SdkworkMembershipAdminPackageGroup[]>;
  listPackages(params?: SdkworkMembershipAdminPackagesListParams): Promise<SdkworkMembershipAdminPackage[]>;
  updateLevel(
    levelId: string,
    input: SdkworkMembershipAdminLevelUpdateInput,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminLevel>;
  updateMembershipStatus(
    membershipId: string,
    input: SdkworkMembershipAdminMembershipUpdateInput,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminMembership>;
  updatePackage(
    packageId: string,
    input: SdkworkMembershipAdminPackageUpdateInput,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminPackage>;
  updatePackageGroup(
    packageGroupId: string,
    input: SdkworkMembershipAdminPackageGroupMutationInput,
    requestParams?: SdkworkCommerceRequestParams,
  ): Promise<SdkworkMembershipAdminPackageGroup>;
}

interface RemotePageEnvelope<T> {
  content?: T[];
  items?: T[];
  records?: T[];
}

type SdkworkMembershipAdminCopyContext = Pick<SdkworkMembershipAdminMessages, "service">;

function extractRecords<T>(payload: RemotePageEnvelope<T> | T[] | null | undefined): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.content ?? payload?.items ?? payload?.records ?? [];
}

function createEmptyDashboard(): SdkworkMembershipAdminDashboardData {
  return {
    entitlements: [],
    levels: [],
    memberships: [],
    packageGroups: [],
    packages: [],
    summary: {
      activeMemberships: 0,
      enabledPackages: 0,
      entitlements: 0,
      levels: 0,
      memberships: 0,
      packageGroups: 0,
      packages: 0,
    },
  };
}

function createDashboard(input: {
  entitlements: SdkworkMembershipAdminEntitlement[];
  levels: SdkworkMembershipAdminLevel[];
  memberships: SdkworkMembershipAdminMembership[];
  packageGroups: SdkworkMembershipAdminPackageGroup[];
  packages: SdkworkMembershipAdminPackage[];
}): SdkworkMembershipAdminDashboardData {
  return {
    ...input,
    summary: {
      activeMemberships: input.memberships.filter((item) => item.status === "active").length,
      enabledPackages: input.packages.filter((item) => item.status === "active").length,
      entitlements: input.entitlements.length,
      levels: input.levels.length,
      memberships: input.memberships.length,
      packageGroups: input.packageGroups.length,
      packages: input.packages.length,
    },
  };
}

function createPackageGroupAssignmentInput(
  packageItem: SdkworkMembershipAdminPackage,
  groupId: string,
): SdkworkMembershipAdminPackageUpdateInput {
  return {
    code: packageItem.code,
    currencyCode: packageItem.currencyCode,
    durationDays: packageItem.durationDays,
    groupId,
    levelId: packageItem.levelId,
    name: packageItem.name,
    priceAmount: packageItem.priceAmount,
    status: packageItem.status,
  };
}

function unwrapAdminResponse<T>(payload: unknown, copy: SdkworkMembershipAdminCopyContext, fallbackMessage: string): T {
  return unwrapSdkworkCommerceResponse<T>(payload, fallbackMessage || copy.service.loadFailed);
}

async function runMembershipAdminOperation<T>(
  operation: () => Promise<T>,
  copy: SdkworkMembershipAdminCopyContext,
  fallbackMessage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(readMembershipAdminErrorMessage(error, fallbackMessage || copy.service.loadFailed));
  }
}

function readMembershipAdminErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
}

export function createSdkworkMembershipAdminService(
  options: CreateSdkworkMembershipAdminServiceOptions = {},
): SdkworkMembershipAdminService {
  const copy = createSdkworkMembershipAdminMessages(options.locale, options.messages);
  const getCommerceService = () => options.commerceService ?? getSdkworkCommerceService();

  const service: SdkworkMembershipAdminService = {
    async assignPackagesToGroup(packages, packageGroupId, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return Promise.all(
        packages.map((packageItem) => service.updatePackage(
          packageItem.id,
          createPackageGroupAssignmentInput(packageItem, packageGroupId),
          requestParams,
        )),
      );
    },

    async createLevel(input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminLevel>(
          await (requestParams
            ? getCommerceService().admin.memberships.plans.create(input, requestParams)
            : getCommerceService().admin.memberships.plans.create(input)),
          copy,
          copy.service.levelCreateFailed,
        ),
        copy,
        copy.service.levelCreateFailed,
      );
    },

    async createPackage(input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackage>(
          await (requestParams
            ? getCommerceService().admin.memberships.packages.create(input, requestParams)
            : getCommerceService().admin.memberships.packages.create(input)),
          copy,
          copy.service.packageCreateFailed,
        ),
        copy,
        copy.service.packageCreateFailed,
      );
    },

    async createPackageGroup(input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackageGroup>(
          await (requestParams
            ? getCommerceService().admin.memberships.packageGroups.create(input, requestParams)
            : getCommerceService().admin.memberships.packageGroups.create(input)),
          copy,
          copy.service.packageGroupCreateFailed,
        ),
        copy,
        copy.service.packageGroupCreateFailed,
      );
    },

    async deleteLevel(levelId, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminLevelDeleteResult>(
          await (requestParams
            ? getCommerceService().admin.memberships.plans.delete(levelId, requestParams)
            : getCommerceService().admin.memberships.plans.delete(levelId)),
          copy,
          copy.service.levelDeleteFailed,
        ),
        copy,
        copy.service.levelDeleteFailed,
      );
    },

    async deletePackage(packageId, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackageDeleteResult>(
          await (requestParams
            ? getCommerceService().admin.memberships.packages.delete(packageId, requestParams)
            : getCommerceService().admin.memberships.packages.delete(packageId)),
          copy,
          copy.service.packageDeleteFailed,
        ),
        copy,
        copy.service.packageDeleteFailed,
      );
    },

    async deletePackageGroup(packageGroupId, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackageGroupDeleteResult>(
          await (requestParams
            ? getCommerceService().admin.memberships.packageGroups.delete(packageGroupId, requestParams)
            : getCommerceService().admin.memberships.packageGroups.delete(packageGroupId)),
          copy,
          copy.service.packageGroupDeleteFailed,
        ),
        copy,
        copy.service.packageGroupDeleteFailed,
      );
    },

    async getDashboard() {
      if (!hasSdkworkCommerceSession()) {
        return createEmptyDashboard();
      }

      const [levels, packages, packageGroups, memberships, entitlements] = await Promise.all([
        service.listLevels(),
        service.listPackages(),
        service.listPackageGroups(),
        service.listMemberships(),
        service.listEntitlements(),
      ]);

      return createDashboard({
        entitlements,
        levels,
        memberships,
        packageGroups,
        packages,
      });
    },

    getEmptyDashboard() {
      return createEmptyDashboard();
    },

    async listEntitlements(params) {
      return runMembershipAdminOperation(
        async () => extractRecords(
          unwrapAdminResponse<RemotePageEnvelope<SdkworkMembershipAdminEntitlement> | SdkworkMembershipAdminEntitlement[]>(
            await getCommerceService().admin.entitlements.grants.list(params),
            copy,
            copy.service.entitlementsLoadFailed,
          ),
        ),
        copy,
        copy.service.entitlementsLoadFailed,
      );
    },

    async listLevels(params) {
      return runMembershipAdminOperation(
        async () => extractRecords(
          unwrapAdminResponse<RemotePageEnvelope<SdkworkMembershipAdminLevel> | SdkworkMembershipAdminLevel[]>(
            await getCommerceService().admin.memberships.plans.management.list(params),
            copy,
            copy.service.levelsLoadFailed,
          ),
        ),
        copy,
        copy.service.levelsLoadFailed,
      );
    },

    async listMemberships(params) {
      return runMembershipAdminOperation(
        async () => extractRecords(
          unwrapAdminResponse<RemotePageEnvelope<SdkworkMembershipAdminMembership> | SdkworkMembershipAdminMembership[]>(
            await getCommerceService().admin.memberships.members.list(params),
            copy,
            copy.service.membershipsLoadFailed,
          ),
        ),
        copy,
        copy.service.membershipsLoadFailed,
      );
    },

    async listPackageGroups(params) {
      return runMembershipAdminOperation(
        async () => extractRecords(
          unwrapAdminResponse<RemotePageEnvelope<SdkworkMembershipAdminPackageGroup> | SdkworkMembershipAdminPackageGroup[]>(
            await getCommerceService().admin.memberships.packageGroups.management.list(params),
            copy,
            copy.service.packageGroupsLoadFailed,
          ),
        ),
        copy,
        copy.service.packageGroupsLoadFailed,
      );
    },

    async listPackages(params) {
      return runMembershipAdminOperation(
        async () => extractRecords(
          unwrapAdminResponse<RemotePageEnvelope<SdkworkMembershipAdminPackage> | SdkworkMembershipAdminPackage[]>(
            await getCommerceService().admin.memberships.packages.management.list(params),
            copy,
            copy.service.packagesLoadFailed,
          ),
        ),
        copy,
        copy.service.packagesLoadFailed,
      );
    },

    async updateLevel(levelId, input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminLevel>(
          await (requestParams
            ? getCommerceService().admin.memberships.plans.update(levelId, input, requestParams)
            : getCommerceService().admin.memberships.plans.update(levelId, input)),
          copy,
          copy.service.levelUpdateFailed,
        ),
        copy,
        copy.service.levelUpdateFailed,
      );
    },

    async updateMembershipStatus(membershipId, input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminMembership>(
          await (requestParams
            ? getCommerceService().admin.memberships.members.update(membershipId, input, requestParams)
            : getCommerceService().admin.memberships.members.update(membershipId, input)),
          copy,
          copy.service.membershipUpdateFailed,
        ),
        copy,
        copy.service.membershipUpdateFailed,
      );
    },

    async updatePackage(packageId, input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackage>(
          await (requestParams
            ? getCommerceService().admin.memberships.packages.update(packageId, input, requestParams)
            : getCommerceService().admin.memberships.packages.update(packageId, input)),
          copy,
          copy.service.packageUpdateFailed,
        ),
        copy,
        copy.service.packageUpdateFailed,
      );
    },

    async updatePackageGroup(packageGroupId, input, requestParams) {
      requireSdkworkCommerceSession(copy.service.signInRequired);
      return runMembershipAdminOperation(
        async () => unwrapAdminResponse<SdkworkMembershipAdminPackageGroup>(
          await (requestParams
            ? getCommerceService().admin.memberships.packageGroups.update(packageGroupId, input, requestParams)
            : getCommerceService().admin.memberships.packageGroups.update(packageGroupId, input)),
          copy,
          copy.service.packageGroupUpdateFailed,
        ),
        copy,
        copy.service.packageGroupUpdateFailed,
      );
    },
  };

  return service;
}

export const sdkworkMembershipAdminService = createSdkworkMembershipAdminService();
