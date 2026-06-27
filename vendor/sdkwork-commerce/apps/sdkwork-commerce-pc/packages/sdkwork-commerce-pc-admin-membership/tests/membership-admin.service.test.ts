import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import {
  createSdkworkMembershipAdminRouteIntent,
  createSdkworkMembershipAdminService,
  createSdkworkMembershipAdminWorkspaceManifest,
} from "../src";

describe("sdkwork-commerce-pc-admin-membership service", () => {
  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "admin-membership-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("uses memberships admin i18n keys and documentation instead of legacy admin tier technical keys", () => {
    const retiredTierRoot = "v" + "ip";
    const packageRoot = "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-membership";
    const copySource = readFileSync(resolve(process.cwd(), packageRoot, "src/membership-admin-copy.ts"), "utf8");
    const pageSource = readFileSync(resolve(process.cwd(), packageRoot, "src/pages/MembershipAdminPage.tsx"), "utf8");
    const readmeSource = readFileSync(resolve(process.cwd(), packageRoot, "README.md"), "utf8");
    const combinedSource = `${copySource}\n${pageSource}\n${readmeSource}`;

    expect(combinedSource).not.toContain("admin." + retiredTierRoot + ".");
    expect(combinedSource).not.toContain("admin." + retiredTierRoot + ".*");
    expect(combinedSource).toContain("admin.memberships.");
    expect(combinedSource).toContain("admin.memberships.*");
  });

  it("loads standard admin membership levels, package groups, packages, memberships, and entitlements through commerce admin runtime", async () => {
    const levelCreate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        code: "pro",
        id: "level-pro",
        name: "Pro",
        rank: 20,
        status: "active",
      },
    });
    const levelUpdate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        code: "pro",
        id: "level-pro",
        name: "Pro",
        rank: 30,
        status: "active",
      },
    });
    const levelDelete = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        deleted: true,
        levelId: "level-pro",
      },
    });
    const packageGroupCreate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        billingCycle: "monthly",
        code: "monthly",
        description: "Monthly membership package group",
        durationDays: 30,
        id: "group-monthly",
        name: "Monthly",
        sortWeight: 10,
        status: "active",
      },
    });
    const packageGroupUpdate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        billingCycle: "monthly",
        code: "monthly",
        description: "Updated",
        durationDays: 30,
        id: "group-monthly",
        name: "Monthly",
        sortWeight: 11,
        status: "active",
      },
    });
    const packageGroupDelete = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        deleted: true,
        packageGroupId: "group-monthly",
      },
    });
    const packageCreate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-monthly",
        id: "package-pro-monthly",
        levelId: "level-pro",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      },
    });
    const packageUpdate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        code: "pro-annual",
        currencyCode: "CNY",
        durationDays: 365,
        groupId: "group-annual",
        id: "package-pro-annual",
        levelId: "level-pro",
        name: "Pro Annual",
        priceAmount: "699.00",
        status: "active",
      },
    });
    const packageDelete = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        deleted: true,
        packageId: "package-pro-annual",
      },
    });
    const membershipUpdate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        expiresAt: "2027-01-01T00:00:00Z",
        id: "membership-1",
        levelCode: "pro",
        ownerUserId: "30",
        startedAt: "2026-01-01T00:00:00Z",
        status: "suspended",
      },
    });
    const commerceService = createCommerceServiceMock({
      admin: {
        entitlements: {
          grants: {
            list: vi.fn().mockResolvedValue({
              code: "2000",
              data: [
                {
                  code: "priority-rendering",
                  id: "entitlement-1",
                  levelId: "level-pro",
                  membershipId: "membership-1",
                  quota: "10",
                  status: "active",
                },
              ],
            }),
          },
        },
        memberships: {
          plans: {
            management: {
              list: vi.fn().mockResolvedValue({
                code: "2000",
                data: {
                  items: [
                    {
                      code: "free",
                      id: "level-free",
                      name: "Free",
                      rank: 0,
                      status: "active",
                    },
                    {
                      code: "pro",
                      id: "level-pro",
                      name: "Pro",
                      rank: 20,
                      status: "active",
                    },
                  ],
                },
              }),
            },
            create: levelCreate,
            update: levelUpdate,
            delete: levelDelete,
          },
          members: {
            list: vi.fn().mockResolvedValue({
              code: "2000",
              data: {
                records: [
                  {
                    expiresAt: "2027-01-01T00:00:00Z",
                    id: "membership-1",
                    levelCode: "pro",
                    ownerUserId: "30",
                    startedAt: "2026-01-01T00:00:00Z",
                    status: "active",
                  },
                ],
              },
            }),
            update: membershipUpdate,
          },
          packageGroups: {
            management: {
              list: vi.fn().mockResolvedValue({
                code: "2000",
                data: [
                  {
                    billingCycle: "monthly",
                    code: "monthly",
                    description: "Monthly membership package group",
                    durationDays: 30,
                    id: "group-monthly",
                    name: "Monthly",
                    sortWeight: 10,
                    status: "active",
                  },
                ],
              }),
            },
            create: packageGroupCreate,
            update: packageGroupUpdate,
            delete: packageGroupDelete,
          },
          packages: {
            management: {
              list: vi.fn().mockResolvedValue({
                code: "2000",
                data: [
                  {
                    code: "pro-annual",
                    currencyCode: "CNY",
                    durationDays: 365,
                    groupId: "group-annual",
                    id: "package-pro-annual",
                    levelId: "level-pro",
                    name: "Pro Annual",
                    priceAmount: "699.00",
                    status: "active",
                  },
                ],
              }),
            },
            create: packageCreate,
            update: packageUpdate,
            delete: packageDelete,
          },
        },
      },
    });
    const service = createSdkworkMembershipAdminService({
      commerceService,
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.summary).toEqual({
      activeMemberships: 1,
      enabledPackages: 1,
      entitlements: 1,
      levels: 2,
      memberships: 1,
      packageGroups: 1,
      packages: 1,
    });
    expect(dashboard.levels[1]).toEqual({
      code: "pro",
      id: "level-pro",
      name: "Pro",
      rank: 20,
      status: "active",
    });
    expect(dashboard.packageGroups[0]).toEqual({
      billingCycle: "monthly",
      code: "monthly",
      description: "Monthly membership package group",
      durationDays: 30,
      id: "group-monthly",
      name: "Monthly",
      sortWeight: 10,
      status: "active",
    });
    expect(dashboard.packages[0]).toEqual({
      code: "pro-annual",
      currencyCode: "CNY",
      durationDays: 365,
      groupId: "group-annual",
      id: "package-pro-annual",
      levelId: "level-pro",
      name: "Pro Annual",
      priceAmount: "699.00",
      status: "active",
    });
    expect(dashboard.memberships[0]).toMatchObject({
      id: "membership-1",
      levelCode: "pro",
      ownerUserId: "30",
      status: "active",
    });
    expect(dashboard.entitlements[0]).toMatchObject({
      code: "priority-rendering",
      quota: "10",
      status: "active",
    });

    await expect(
      service.createLevel({
        code: "pro",
        name: "Pro",
        rank: 20,
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "level-pro",
      rank: 20,
    });
    await expect(
      service.updateLevel("level-pro", {
        code: "pro",
        name: "Pro",
        rank: 30,
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "level-pro",
      rank: 30,
    });
    await expect(service.deleteLevel("level-pro")).resolves.toEqual({
      deleted: true,
      levelId: "level-pro",
    });
    await expect(
      service.createPackageGroup({
        billingCycle: "monthly",
        code: "monthly",
        description: "Monthly membership package group",
        durationDays: 30,
        name: "Monthly",
        sortWeight: 10,
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "group-monthly",
      sortWeight: 10,
    });
    await expect(
      service.updatePackageGroup("group-monthly", {
        billingCycle: "monthly",
        code: "monthly",
        description: "Updated",
        durationDays: 30,
        name: "Monthly",
        sortWeight: 11,
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "group-monthly",
      sortWeight: 11,
    });
    await expect(service.deletePackageGroup("group-monthly")).resolves.toEqual({
      deleted: true,
      packageGroupId: "group-monthly",
    });
    await expect(
      service.createPackage({
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-monthly",
        levelId: "level-pro",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "package-pro-monthly",
      priceAmount: "199.00",
    });
    await expect(
      service.updatePackage("package-pro-annual", {
        code: "pro-annual",
        currencyCode: "CNY",
        durationDays: 365,
        groupId: "group-annual",
        levelId: "level-pro",
        name: "Pro Annual",
        priceAmount: "699.00",
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "package-pro-annual",
      priceAmount: "699.00",
    });
    await expect(service.deletePackage("package-pro-annual")).resolves.toEqual({
      deleted: true,
      packageId: "package-pro-annual",
    });
    await expect(
      service.updateMembershipStatus("membership-1", {
        status: "suspended",
      }),
    ).resolves.toMatchObject({
      id: "membership-1",
      status: "suspended",
    });

    expect(levelCreate).toHaveBeenCalledWith({
      code: "pro",
      name: "Pro",
      rank: 20,
      status: "active",
    });
    expect(levelUpdate).toHaveBeenCalledWith("level-pro", {
      code: "pro",
      name: "Pro",
      rank: 30,
      status: "active",
    });
    expect(levelDelete).toHaveBeenCalledWith("level-pro");
    expect(packageGroupCreate).toHaveBeenCalledWith({
      billingCycle: "monthly",
      code: "monthly",
      description: "Monthly membership package group",
      durationDays: 30,
      name: "Monthly",
      sortWeight: 10,
      status: "active",
    });
    expect(packageGroupUpdate).toHaveBeenCalledWith("group-monthly", {
      billingCycle: "monthly",
      code: "monthly",
      description: "Updated",
      durationDays: 30,
      name: "Monthly",
      sortWeight: 11,
      status: "active",
    });
    expect(packageGroupDelete).toHaveBeenCalledWith("group-monthly");
    expect(packageCreate).toHaveBeenCalledWith({
      code: "pro-monthly",
      currencyCode: "CNY",
      durationDays: 30,
      groupId: "group-monthly",
      levelId: "level-pro",
      name: "Pro Monthly",
      priceAmount: "199.00",
      status: "active",
    });
    expect(packageUpdate).toHaveBeenCalledWith("package-pro-annual", {
      code: "pro-annual",
      currencyCode: "CNY",
      durationDays: 365,
      groupId: "group-annual",
      levelId: "level-pro",
      name: "Pro Annual",
      priceAmount: "699.00",
      status: "active",
    });
    expect(packageDelete).toHaveBeenCalledWith("package-pro-annual");
    expect(membershipUpdate).toHaveBeenCalledWith("membership-1", {
      status: "suspended",
    });
  });

  it("assigns packages to a package group by reusing the standard package update contract", async () => {
    const packageUpdate = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-target",
        id: "package-pro-monthly",
        levelId: "level-pro",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      },
    });
    const commerceService = createCommerceServiceMock({
      admin: {
        memberships: {
          packages: {
            update: packageUpdate,
          },
        },
      },
    });
    const service = createSdkworkMembershipAdminService({
      commerceService,
    });

    await expect(
      service.assignPackagesToGroup(
        [
          {
            code: "pro-monthly",
            currencyCode: "CNY",
            durationDays: 30,
            groupId: "group-source",
            id: "package-pro-monthly",
            levelId: "level-pro",
            name: "Pro Monthly",
            priceAmount: "199.00",
            status: "active",
          },
        ],
        "group-target",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        groupId: "group-target",
        id: "package-pro-monthly",
      }),
    ]);

    expect(packageUpdate).toHaveBeenCalledWith("package-pro-monthly", {
      code: "pro-monthly",
      currencyCode: "CNY",
      durationDays: 30,
      groupId: "group-target",
      levelId: "level-pro",
      name: "Pro Monthly",
      priceAmount: "199.00",
      status: "active",
    });
  });

  it("returns a guest-safe empty dashboard and localizes mutation auth failures", async () => {
    resetCommerceServiceMockSession();
    const service = createSdkworkMembershipAdminService({
      locale: "zh-CN",
    });

    await expect(service.getDashboard()).resolves.toMatchObject({
      summary: {
        levels: 0,
        packageGroups: 0,
        packages: 0,
      },
    });
    await expect(
      service.updateMembershipStatus("membership-1", {
        status: "active",
      }),
    ).rejects.toThrow("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u4f1a\u5458\u540e\u53f0\u3002");
  });

  it("creates route intents and a standalone admin membership workspace manifest", () => {
    expect(createSdkworkMembershipAdminRouteIntent({
      view: "packages",
    })).toMatchObject({
      route: "/admin/memberships?view=packages",
      source: "membership-admin-workspace",
      view: "packages",
    });
    expect(createSdkworkMembershipAdminWorkspaceManifest()).toMatchObject({
      capability: "membership-admin",
      packageNames: ["@sdkwork/commerce-pc-admin-membership"],
      routePath: "/admin/memberships",
    });
  });
});
