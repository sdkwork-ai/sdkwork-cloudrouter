export type SdkworkMembershipAdminLocale = "en-US" | "zh-CN";

export type SdkworkMembershipAdminMessagesOverrides = DeepPartial<SdkworkMembershipAdminMessages>;

export interface SdkworkMembershipAdminMessages {
  actions: {
    entitlements: string;
    levels: string;
    memberships: string;
    packages: string;
    refresh: string;
  };
  page: {
    description: string;
    emptyDescription: string;
    emptyTitle: string;
    errorTitle: string;
    loading: string;
    title: string;
  };
  service: {
    entitlementsLoadFailed: string;
    levelCreateFailed: string;
    levelDeleteFailed: string;
    packageCreateFailed: string;
    packageDeleteFailed: string;
    packageGroupCreateFailed: string;
    packageGroupDeleteFailed: string;
    packageGroupsLoadFailed: string;
    packageGroupUpdateFailed: string;
    levelsLoadFailed: string;
    levelUpdateFailed: string;
    loadFailed: string;
    membershipsLoadFailed: string;
    membershipUpdateFailed: string;
    packagesLoadFailed: string;
    packageUpdateFailed: string;
    signInRequired: string;
  };
  status: {
    disabled: string;
    enabled: string;
    unknown: string;
  };
  summary: {
    activeMemberships: string;
    entitlements: string;
    levels: string;
    packages: string;
  };
  ui: Record<string, string>;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) {
    return base;
  }

  const output: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      continue;
    }

    const baseValue = output[key];
    output[key] = isRecord(baseValue) && isRecord(value)
      ? mergeDeep(baseValue, value)
      : value;
  }

  return output as T;
}

const EN_US_MESSAGES: SdkworkMembershipAdminMessages = {
  actions: {
    entitlements: "Entitlements",
    levels: "Levels",
    memberships: "Memberships",
    packages: "Packages",
    refresh: "Refresh",
  },
  page: {
    description: "Manage membership levels, packages, memberships, and entitlement inventory from one admin workspace.",
    emptyDescription: "Admin membership records will appear after the commerce backend returns data.",
    emptyTitle: "No membership admin records",
    errorTitle: "Membership admin error",
    loading: "Loading membership admin...",
    title: "Membership Admin",
  },
  service: {
    entitlementsLoadFailed: "Failed to load membership entitlements.",
    levelCreateFailed: "Failed to create membership level.",
    levelDeleteFailed: "Failed to delete membership level.",
    packageCreateFailed: "Failed to create membership package.",
    packageDeleteFailed: "Failed to delete membership package.",
    packageGroupCreateFailed: "Failed to create membership package group.",
    packageGroupDeleteFailed: "Failed to delete membership package group.",
    packageGroupsLoadFailed: "Failed to load membership package groups.",
    packageGroupUpdateFailed: "Failed to update membership package group.",
    levelsLoadFailed: "Failed to load membership levels.",
    levelUpdateFailed: "Failed to update membership levels.",
    loadFailed: "Failed to load membership admin data.",
    membershipsLoadFailed: "Failed to load membership records.",
    membershipUpdateFailed: "Failed to update membership record.",
    packagesLoadFailed: "Failed to load membership packages.",
    packageUpdateFailed: "Failed to update membership packages.",
    signInRequired: "Please sign in to manage membership administration.",
  },
  status: {
    disabled: "Disabled",
    enabled: "Enabled",
    unknown: "Unknown",
  },
  summary: {
    activeMemberships: "Active memberships",
    entitlements: "Entitlements",
    levels: "Levels",
    packages: "Packages",
  },
  ui: {
    "admin.memberships.actions.addPackageToGroup": "Add package to group",
    "admin.memberships.actions.addSelectedPackages": "Add selected packages",
    "admin.memberships.actions.cancel": "Cancel",
    "admin.memberships.actions.closeModal": "Close modal",
    "admin.memberships.actions.confirm": "Confirm",
    "admin.memberships.actions.createGroup": "Create group",
    "admin.memberships.actions.createLevel": "New level",
    "admin.memberships.actions.createPackage": "Create package",
    "admin.memberships.actions.delete": "Delete",
    "admin.memberships.actions.disable": "Disable",
    "admin.memberships.actions.edit": "Edit",
    "admin.memberships.actions.refresh": "Refresh",
    "admin.memberships.actions.saveGroup": "Save group",
    "admin.memberships.actions.saveLevel": "Save level",
    "admin.memberships.actions.savePackage": "Save package",
    "admin.memberships.actions.saving": "Saving...",
    "admin.memberships.empty.entitlements": "No membership entitlements found",
    "admin.memberships.empty.groupPackages": "No packages in this group",
    "admin.memberships.empty.levels": "No membership levels found",
    "admin.memberships.empty.memberships": "No membership records found",
    "admin.memberships.empty.noPackageGroupSelected": "Select a package group first",
    "admin.memberships.empty.noPackagesToAdd": "No packages available to add",
    "admin.memberships.empty.packageGroups": "No membership package groups found",
    "admin.memberships.errors.activeLevelRequired": "Create an active membership level before adding packages.",
    "admin.memberships.errors.activePackageGroupRequired": "Create an active membership package group before adding packages.",
    "admin.memberships.errors.entitlementsLoadFallback": "Failed to load membership entitlements.",
    "admin.memberships.errors.invalidDurationDays": "Duration days must be a positive integer.",
    "admin.memberships.errors.invalidLevelStatus": "Invalid membership level status.",
    "admin.memberships.errors.invalidMembershipStatus": "Invalid membership record status.",
    "admin.memberships.errors.invalidPackageGroupStatus": "Invalid membership package group status.",
    "admin.memberships.errors.invalidPackageStatus": "Invalid membership package status.",
    "admin.memberships.errors.invalidRank": "Rank must be a non-negative integer.",
    "admin.memberships.errors.invalidSortWeight": "Sort weight must be a non-negative integer.",
    "admin.memberships.errors.levelCreateFallback": "Failed to create membership level.",
    "admin.memberships.errors.levelDeleteFallback": "Failed to disable membership level.",
    "admin.memberships.errors.levelSaveFallback": "Failed to save membership level.",
    "admin.memberships.errors.levelsLoadFallback": "Failed to load membership levels.",
    "admin.memberships.errors.loadFallback": "Failed to load membership management data.",
    "admin.memberships.errors.membershipStatusFallback": "Failed to update membership record status.",
    "admin.memberships.errors.membershipsLoadFallback": "Failed to load membership records.",
    "admin.memberships.errors.packageCreateFallback": "Failed to create membership package.",
    "admin.memberships.errors.packageDeleteFallback": "Failed to delete membership package.",
    "admin.memberships.errors.packageGroupCreateFallback": "Failed to create membership package group.",
    "admin.memberships.errors.packageGroupDeleteFallback": "Failed to delete membership package group.",
    "admin.memberships.errors.packageGroupSaveFallback": "Failed to save membership package group.",
    "admin.memberships.errors.packageGroupsLoadFallback": "Failed to load membership package groups.",
    "admin.memberships.errors.packageSaveFallback": "Failed to save membership package.",
    "admin.memberships.errors.packagesLoadFallback": "Failed to load membership packages.",
    "admin.memberships.errors.saveLevelFallback": "Failed to save membership level.",
    "admin.memberships.errors.savePackageFallback": "Failed to save membership package.",
    "admin.memberships.fields.billingCycle": "Billing cycle",
    "admin.memberships.fields.code": "Code",
    "admin.memberships.fields.currency": "Currency",
    "admin.memberships.fields.description": "Description",
    "admin.memberships.fields.durationDays": "Duration days",
    "admin.memberships.fields.level": "Level",
    "admin.memberships.fields.name": "Name",
    "admin.memberships.fields.packageGroup": "Package Group",
    "admin.memberships.fields.price": "Price",
    "admin.memberships.fields.rank": "Rank",
    "admin.memberships.fields.sortWeight": "Sort weight",
    "admin.memberships.fields.status": "Status",
    "admin.memberships.forms.levelDefinition": "Level Definition",
    "admin.memberships.forms.purchasePackage": "Purchase Package",
    "admin.memberships.labels.packageGroups": "Package groups",
    "admin.memberships.modals.addPackagesToGroupTitle": "Add packages to group",
    "admin.memberships.modals.addPackagesToNamedGroupTitle": "Add packages to {name}",
    "admin.memberships.modals.createGroupTitle": "Create membership package group",
    "admin.memberships.modals.createLevelTitle": "Create membership level",
    "admin.memberships.modals.createPackageTitle": "Create membership package",
    "admin.memberships.modals.deleteGroupTitle": "Delete membership package group",
    "admin.memberships.modals.deletePackageTitle": "Delete membership package",
    "admin.memberships.modals.disableLevelTitle": "Disable membership level",
    "admin.memberships.modals.editGroupTitle": "Edit membership package group",
    "admin.memberships.modals.editLevelTitle": "Edit membership level",
    "admin.memberships.modals.editPackageTitle": "Edit membership package",
    "admin.memberships.states.loadError": "Membership management data could not be loaded",
    "admin.memberships.states.loading": "Loading membership management data...",
    "admin.memberships.states.saveErrorTitle": "Membership management change was not saved",
    "admin.memberships.status.active": "Active",
    "admin.memberships.status.cancelled": "Cancelled",
    "admin.memberships.status.disabled": "Disabled",
    "admin.memberships.status.exhausted": "Exhausted",
    "admin.memberships.status.expired": "Expired",
    "admin.memberships.status.inactive": "Inactive",
    "admin.memberships.status.suspended": "Suspended",
    "admin.memberships.table.billingCycle": "Billing Cycle",
    "admin.memberships.table.expires": "Expires",
    "admin.memberships.table.group": "Group",
    "admin.memberships.table.id": "ID",
    "admin.memberships.table.operations": "Operations",
    "admin.memberships.table.sort": "Sort",
    "admin.memberships.table.started": "Started",
    "admin.memberships.table.user": "User",
    "admin.memberships.tabs.entitlements": "Entitlements",
    "admin.memberships.tabs.levels": "Membership Levels",
    "admin.memberships.tabs.memberships": "Memberships",
    "admin.memberships.tabs.packages": "Packages",
    "admin.memberships.filters.packagePickerSearch": "Search packages...",
    "admin.memberships.filters.search": "Search membership records...",
    "common.retry": "Retry",
  },
};

const ZH_CN_MESSAGES: SdkworkMembershipAdminMessages = {
  actions: {
    entitlements: "\u6743\u76ca",
    levels: "\u7b49\u7ea7",
    memberships: "\u4f1a\u5458",
    packages: "\u5957\u9910",
    refresh: "\u5237\u65b0",
  },
  page: {
    description: "\u5728\u4e00\u4e2a\u7ba1\u7406\u5de5\u4f5c\u53f0\u4e2d\u7edf\u4e00\u7ba1\u7406 \u4f1a\u5458\u7b49\u7ea7\u3001\u5957\u9910\u3001\u4f1a\u5458\u548c\u6743\u76ca\u5e93\u5b58\u3002",
    emptyDescription: "\u5f53\u5546\u4e1a\u540e\u53f0\u8fd4\u56de\u6570\u636e\u540e\uff0c\u4f1a\u5458\u7ba1\u7406\u8bb0\u5f55\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002",
    emptyTitle: "\u6682\u65e0 \u4f1a\u5458\u7ba1\u7406\u8bb0\u5f55",
    errorTitle: "\u4f1a\u5458\u7ba1\u7406\u5f02\u5e38",
    loading: "\u6b63\u5728\u52a0\u8f7d \u4f1a\u5458\u7ba1\u7406...",
    title: "\u4f1a\u5458\u7ba1\u7406",
  },
  service: {
    entitlementsLoadFailed: "\u52a0\u8f7d \u4f1a\u5458\u6743\u76ca\u5931\u8d25\u3002",
    levelCreateFailed: "\u521b\u5efa \u4f1a\u5458\u7b49\u7ea7\u5931\u8d25\u3002",
    levelDeleteFailed: "\u5220\u9664 \u4f1a\u5458\u7b49\u7ea7\u5931\u8d25\u3002",
    packageCreateFailed: "\u521b\u5efa \u4f1a\u5458\u5957\u9910\u5931\u8d25\u3002",
    packageDeleteFailed: "\u5220\u9664 \u4f1a\u5458\u5957\u9910\u5931\u8d25\u3002",
    packageGroupCreateFailed: "\u521b\u5efa \u4f1a\u5458\u5957\u9910\u5206\u7ec4\u5931\u8d25\u3002",
    packageGroupDeleteFailed: "\u5220\u9664 \u4f1a\u5458\u5957\u9910\u5206\u7ec4\u5931\u8d25\u3002",
    packageGroupsLoadFailed: "\u52a0\u8f7d \u4f1a\u5458\u5957\u9910\u5206\u7ec4\u5931\u8d25\u3002",
    packageGroupUpdateFailed: "\u66f4\u65b0 \u4f1a\u5458\u5957\u9910\u5206\u7ec4\u5931\u8d25\u3002",
    levelsLoadFailed: "\u52a0\u8f7d \u4f1a\u5458\u7b49\u7ea7\u5931\u8d25\u3002",
    levelUpdateFailed: "\u66f4\u65b0 \u4f1a\u5458\u7b49\u7ea7\u5931\u8d25\u3002",
    loadFailed: "\u52a0\u8f7d \u4f1a\u5458\u7ba1\u7406\u6570\u636e\u5931\u8d25\u3002",
    membershipsLoadFailed: "\u52a0\u8f7d \u4f1a\u5458\u8bb0\u5f55\u5931\u8d25\u3002",
    membershipUpdateFailed: "\u66f4\u65b0 \u4f1a\u5458\u8bb0\u5f55\u5931\u8d25\u3002",
    packagesLoadFailed: "\u52a0\u8f7d \u4f1a\u5458\u5957\u9910\u5931\u8d25\u3002",
    packageUpdateFailed: "\u66f4\u65b0 \u4f1a\u5458\u5957\u9910\u5931\u8d25\u3002",
    signInRequired: "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u4f1a\u5458\u540e\u53f0\u3002",
  },
  status: {
    disabled: "\u5df2\u505c\u7528",
    enabled: "\u5df2\u542f\u7528",
    unknown: "\u672a\u77e5",
  },
  summary: {
    activeMemberships: "\u751f\u6548\u4f1a\u5458",
    entitlements: "\u6743\u76ca",
    levels: "\u7b49\u7ea7",
    packages: "\u5957\u9910",
  },
  ui: {
    "admin.memberships.actions.addPackageToGroup": "\u6dfb\u52a0\u5957\u9910\u5230\u5206\u7ec4",
    "admin.memberships.actions.addSelectedPackages": "\u6dfb\u52a0\u5df2\u9009\u5957\u9910",
    "admin.memberships.actions.cancel": "\u53d6\u6d88",
    "admin.memberships.actions.closeModal": "\u5173\u95ed\u5f39\u7a97",
    "admin.memberships.actions.confirm": "\u786e\u8ba4",
    "admin.memberships.actions.createGroup": "\u521b\u5efa\u5206\u7ec4",
    "admin.memberships.actions.createLevel": "\u65b0\u5efa\u7b49\u7ea7",
    "admin.memberships.actions.createPackage": "\u521b\u5efa\u5957\u9910",
    "admin.memberships.actions.delete": "\u5220\u9664",
    "admin.memberships.actions.disable": "\u505c\u7528",
    "admin.memberships.actions.edit": "\u7f16\u8f91",
    "admin.memberships.actions.refresh": "\u5237\u65b0",
    "admin.memberships.actions.saveGroup": "\u4fdd\u5b58\u5206\u7ec4",
    "admin.memberships.actions.saveLevel": "\u4fdd\u5b58\u7b49\u7ea7",
    "admin.memberships.actions.savePackage": "\u4fdd\u5b58\u5957\u9910",
    "admin.memberships.actions.saving": "\u4fdd\u5b58\u4e2d...",
    "admin.memberships.empty.entitlements": "\u6682\u65e0 \u4f1a\u5458\u6743\u76ca",
    "admin.memberships.empty.groupPackages": "\u5f53\u524d\u5206\u7ec4\u6682\u65e0\u5957\u9910",
    "admin.memberships.empty.levels": "\u6682\u65e0 \u4f1a\u5458\u7b49\u7ea7",
    "admin.memberships.empty.memberships": "\u6682\u65e0 \u4f1a\u5458\u8bb0\u5f55",
    "admin.memberships.empty.noPackageGroupSelected": "\u8bf7\u5148\u9009\u62e9\u5957\u9910\u5206\u7ec4",
    "admin.memberships.empty.noPackagesToAdd": "\u6682\u65e0\u53ef\u6dfb\u52a0\u5957\u9910",
    "admin.memberships.empty.packageGroups": "\u6682\u65e0 \u4f1a\u5458\u5957\u9910\u5206\u7ec4",
    "admin.memberships.errors.activeLevelRequired": "\u8bf7\u5148\u521b\u5efa\u542f\u7528\u72b6\u6001\u7684 \u4f1a\u5458\u7b49\u7ea7\u3002",
    "admin.memberships.errors.activePackageGroupRequired": "\u8bf7\u5148\u521b\u5efa\u542f\u7528\u72b6\u6001\u7684 \u4f1a\u5458\u5957\u9910\u5206\u7ec4\u3002",
    "admin.memberships.errors.entitlementsLoadFallback": "\u4f1a\u5458\u6743\u76ca\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.invalidDurationDays": "\u6709\u6548\u5929\u6570\u5fc5\u987b\u662f\u6b63\u6574\u6570\u3002",
    "admin.memberships.errors.invalidLevelStatus": "\u4f1a\u5458\u7b49\u7ea7\u72b6\u6001\u65e0\u6548\u3002",
    "admin.memberships.errors.invalidMembershipStatus": "\u4f1a\u5458\u8bb0\u5f55\u72b6\u6001\u65e0\u6548\u3002",
    "admin.memberships.errors.invalidPackageGroupStatus": "\u4f1a\u5458\u5957\u9910\u5206\u7ec4\u72b6\u6001\u65e0\u6548\u3002",
    "admin.memberships.errors.invalidPackageStatus": "\u4f1a\u5458\u5957\u9910\u72b6\u6001\u65e0\u6548\u3002",
    "admin.memberships.errors.invalidRank": "\u6392\u5e8f\u7b49\u7ea7\u5fc5\u987b\u662f\u975e\u8d1f\u6574\u6570\u3002",
    "admin.memberships.errors.invalidSortWeight": "\u6392\u5e8f\u6743\u91cd\u5fc5\u987b\u662f\u975e\u8d1f\u6574\u6570\u3002",
    "admin.memberships.errors.levelCreateFallback": "\u4f1a\u5458\u7b49\u7ea7\u521b\u5efa\u5931\u8d25\u3002",
    "admin.memberships.errors.levelDeleteFallback": "\u4f1a\u5458\u7b49\u7ea7\u505c\u7528\u5931\u8d25\u3002",
    "admin.memberships.errors.levelSaveFallback": "\u4f1a\u5458\u7b49\u7ea7\u4fdd\u5b58\u5931\u8d25\u3002",
    "admin.memberships.errors.levelsLoadFallback": "\u4f1a\u5458\u7b49\u7ea7\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.loadFallback": "\u4f1a\u5458\u7ba1\u7406\u6570\u636e\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.membershipStatusFallback": "\u4f1a\u5458\u8bb0\u5f55\u72b6\u6001\u66f4\u65b0\u5931\u8d25\u3002",
    "admin.memberships.errors.membershipsLoadFallback": "\u4f1a\u5458\u8bb0\u5f55\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.packageCreateFallback": "\u4f1a\u5458\u5957\u9910\u521b\u5efa\u5931\u8d25\u3002",
    "admin.memberships.errors.packageDeleteFallback": "\u4f1a\u5458\u5957\u9910\u5220\u9664\u5931\u8d25\u3002",
    "admin.memberships.errors.packageGroupCreateFallback": "\u4f1a\u5458\u5957\u9910\u5206\u7ec4\u521b\u5efa\u5931\u8d25\u3002",
    "admin.memberships.errors.packageGroupDeleteFallback": "\u4f1a\u5458\u5957\u9910\u5206\u7ec4\u5220\u9664\u5931\u8d25\u3002",
    "admin.memberships.errors.packageGroupSaveFallback": "\u4f1a\u5458\u5957\u9910\u5206\u7ec4\u4fdd\u5b58\u5931\u8d25\u3002",
    "admin.memberships.errors.packageGroupsLoadFallback": "\u4f1a\u5458\u5957\u9910\u5206\u7ec4\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.packageSaveFallback": "\u4f1a\u5458\u5957\u9910\u4fdd\u5b58\u5931\u8d25\u3002",
    "admin.memberships.errors.packagesLoadFallback": "\u4f1a\u5458\u5957\u9910\u52a0\u8f7d\u5931\u8d25\u3002",
    "admin.memberships.errors.saveLevelFallback": "\u4f1a\u5458\u7b49\u7ea7\u4fdd\u5b58\u5931\u8d25\u3002",
    "admin.memberships.errors.savePackageFallback": "\u4f1a\u5458\u5957\u9910\u4fdd\u5b58\u5931\u8d25\u3002",
    "admin.memberships.fields.billingCycle": "\u8ba1\u8d39\u5468\u671f",
    "admin.memberships.fields.code": "\u7f16\u7801",
    "admin.memberships.fields.currency": "\u5e01\u79cd",
    "admin.memberships.fields.description": "\u63cf\u8ff0",
    "admin.memberships.fields.durationDays": "\u6709\u6548\u5929\u6570",
    "admin.memberships.fields.level": "\u7b49\u7ea7",
    "admin.memberships.fields.name": "\u540d\u79f0",
    "admin.memberships.fields.packageGroup": "\u5957\u9910\u5206\u7ec4",
    "admin.memberships.fields.price": "\u4ef7\u683c",
    "admin.memberships.fields.rank": "\u6392\u5e8f\u7b49\u7ea7",
    "admin.memberships.fields.sortWeight": "\u6392\u5e8f\u6743\u91cd",
    "admin.memberships.fields.status": "\u72b6\u6001",
    "admin.memberships.forms.levelDefinition": "\u7b49\u7ea7\u5b9a\u4e49",
    "admin.memberships.forms.purchasePackage": "\u8d2d\u4e70\u5957\u9910",
    "admin.memberships.labels.packageGroups": "\u5957\u9910\u5206\u7ec4",
    "admin.memberships.modals.addPackagesToGroupTitle": "\u6dfb\u52a0\u5957\u9910\u5230\u5206\u7ec4",
    "admin.memberships.modals.addPackagesToNamedGroupTitle": "\u6dfb\u52a0\u5957\u9910\u5230 {name}",
    "admin.memberships.modals.createGroupTitle": "\u521b\u5efa \u4f1a\u5458\u5957\u9910\u5206\u7ec4",
    "admin.memberships.modals.createLevelTitle": "\u521b\u5efa \u4f1a\u5458\u7b49\u7ea7",
    "admin.memberships.modals.createPackageTitle": "\u521b\u5efa \u4f1a\u5458\u5957\u9910",
    "admin.memberships.modals.deleteGroupTitle": "\u5220\u9664 \u4f1a\u5458\u5957\u9910\u5206\u7ec4",
    "admin.memberships.modals.deletePackageTitle": "\u5220\u9664 \u4f1a\u5458\u5957\u9910",
    "admin.memberships.modals.disableLevelTitle": "\u505c\u7528 \u4f1a\u5458\u7b49\u7ea7",
    "admin.memberships.modals.editGroupTitle": "\u7f16\u8f91 \u4f1a\u5458\u5957\u9910\u5206\u7ec4",
    "admin.memberships.modals.editLevelTitle": "\u7f16\u8f91 \u4f1a\u5458\u7b49\u7ea7",
    "admin.memberships.modals.editPackageTitle": "\u7f16\u8f91 \u4f1a\u5458\u5957\u9910",
    "admin.memberships.states.loadError": "\u4f1a\u5458\u7ba1\u7406\u6570\u636e\u52a0\u8f7d\u5931\u8d25",
    "admin.memberships.states.loading": "\u6b63\u5728\u52a0\u8f7d \u4f1a\u5458\u7ba1\u7406\u6570\u636e...",
    "admin.memberships.states.saveErrorTitle": "\u4f1a\u5458\u7ba1\u7406\u53d8\u66f4\u672a\u4fdd\u5b58",
    "admin.memberships.status.active": "\u542f\u7528",
    "admin.memberships.status.cancelled": "\u5df2\u53d6\u6d88",
    "admin.memberships.status.disabled": "\u5df2\u505c\u7528",
    "admin.memberships.status.exhausted": "\u5df2\u7528\u5c3d",
    "admin.memberships.status.expired": "\u5df2\u8fc7\u671f",
    "admin.memberships.status.inactive": "\u672a\u542f\u7528",
    "admin.memberships.status.suspended": "\u5df2\u6682\u505c",
    "admin.memberships.table.billingCycle": "\u8ba1\u8d39\u5468\u671f",
    "admin.memberships.table.expires": "\u5230\u671f\u65f6\u95f4",
    "admin.memberships.table.group": "\u5206\u7ec4",
    "admin.memberships.table.id": "ID",
    "admin.memberships.table.operations": "\u64cd\u4f5c",
    "admin.memberships.table.sort": "\u6392\u5e8f",
    "admin.memberships.table.started": "\u5f00\u59cb\u65f6\u95f4",
    "admin.memberships.table.user": "\u7528\u6237",
    "admin.memberships.tabs.entitlements": "\u6743\u76ca",
    "admin.memberships.tabs.levels": "\u4f1a\u5458\u7b49\u7ea7",
    "admin.memberships.tabs.memberships": "\u4f1a\u5458",
    "admin.memberships.tabs.packages": "\u5957\u9910",
    "admin.memberships.filters.packagePickerSearch": "\u641c\u7d22\u5957\u9910...",
    "admin.memberships.filters.search": "\u641c\u7d22 \u4f1a\u5458\u8bb0\u5f55...",
    "common.retry": "\u91cd\u8bd5",
  },
};

const SDKWORK_MEMBERSHIP_ADMIN_MESSAGES: Record<SdkworkMembershipAdminLocale, SdkworkMembershipAdminMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkMembershipAdminLocale(locale?: string | null): SdkworkMembershipAdminLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkMembershipAdminMessages(
  locale?: string | null,
  overrides?: SdkworkMembershipAdminMessagesOverrides,
): SdkworkMembershipAdminMessages {
  return mergeDeep(
    SDKWORK_MEMBERSHIP_ADMIN_MESSAGES[normalizeSdkworkMembershipAdminLocale(locale)],
    overrides,
  );
}
