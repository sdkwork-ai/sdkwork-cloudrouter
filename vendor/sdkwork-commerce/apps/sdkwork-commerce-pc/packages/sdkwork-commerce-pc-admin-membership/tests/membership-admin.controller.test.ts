import { describe, expect, it, vi } from "vitest";
import { createSdkworkMembershipAdminController } from "../src";

describe("sdkwork-commerce-pc-admin-membership controller", () => {
  it("bootstraps, switches views, and refreshes after every admin membership mutation", async () => {
    const dashboard = {
      entitlements: [],
      levels: [
        {
          code: "free",
          id: "level-free",
          name: "Free",
          rank: 0,
          status: "active" as const,
        },
      ],
      memberships: [],
      packageGroups: [
        {
          billingCycle: "monthly",
          code: "monthly",
          description: "Monthly",
          durationDays: 30,
          id: "group-monthly",
          name: "Monthly",
          sortWeight: 10,
          status: "active" as const,
        },
      ],
      packages: [],
      summary: {
        activeMemberships: 0,
        enabledPackages: 0,
        entitlements: 0,
        levels: 1,
        memberships: 0,
        packageGroups: 1,
        packages: 0,
      },
    };
    const service = {
      assignPackagesToGroup: vi.fn().mockResolvedValue([]),
      createLevel: vi.fn().mockResolvedValue(dashboard.levels[0]),
      createPackage: vi.fn().mockResolvedValue({
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-monthly",
        id: "package-pro-monthly",
        levelId: "level-free",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      }),
      createPackageGroup: vi.fn().mockResolvedValue(dashboard.packageGroups[0]),
      deleteLevel: vi.fn().mockResolvedValue({
        deleted: true,
        levelId: "level-free",
      }),
      deletePackage: vi.fn().mockResolvedValue({
        deleted: true,
        packageId: "package-pro-monthly",
      }),
      deletePackageGroup: vi.fn().mockResolvedValue({
        deleted: true,
        packageGroupId: "group-monthly",
      }),
      getDashboard: vi.fn().mockResolvedValue(dashboard),
      getEmptyDashboard: vi.fn().mockReturnValue({
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
      }),
      updateLevel: vi.fn().mockResolvedValue(dashboard.levels[0]),
      updateMembershipStatus: vi.fn().mockResolvedValue({
        expiresAt: "2027-01-01T00:00:00Z",
        id: "membership-1",
        levelCode: "free",
        ownerUserId: "30",
        startedAt: "2026-01-01T00:00:00Z",
        status: "suspended",
      }),
      updatePackage: vi.fn().mockResolvedValue({
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-monthly",
        id: "package-pro-monthly",
        levelId: "level-free",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      }),
      updatePackageGroup: vi.fn().mockResolvedValue(dashboard.packageGroups[0]),
    };
    const controller = createSdkworkMembershipAdminController({
      service,
    });

    await expect(controller.bootstrap()).resolves.toMatchObject({
      dashboard,
      isBootstrapped: true,
    });

    controller.setView("packages");
    expect(controller.getState().activeView).toBe("packages");

    await expect(
      controller.createLevel({
        code: "free",
        name: "Free",
        rank: 0,
        status: "active",
      }),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.updateLevel("level-free", {
        code: "free",
        name: "Free",
        rank: 1,
        status: "active",
      }),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(controller.deleteLevel("level-free")).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.createPackageGroup({
        billingCycle: "monthly",
        code: "monthly",
        durationDays: 30,
        name: "Monthly",
        sortWeight: 10,
        status: "active",
      }),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.updatePackageGroup("group-monthly", {
        billingCycle: "monthly",
        code: "monthly",
        durationDays: 30,
        name: "Monthly",
        sortWeight: 11,
        status: "active",
      }),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(controller.deletePackageGroup("group-monthly")).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.createPackage({
        code: "pro-monthly",
        currencyCode: "CNY",
        durationDays: 30,
        groupId: "group-monthly",
        levelId: "level-free",
        name: "Pro Monthly",
        priceAmount: "199.00",
        status: "active",
      }),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.assignPackagesToGroup([], "group-monthly"),
    ).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(controller.deletePackage("package-pro-monthly")).resolves.toMatchObject({
      dashboard,
      isMutating: false,
    });
    await expect(
      controller.updateMembershipStatus("membership-1", {
        status: "suspended",
      }),
    ).resolves.toMatchObject({
      id: "membership-1",
      status: "suspended",
    });

    expect(service.createLevel).toHaveBeenCalledWith({
      code: "free",
      name: "Free",
      rank: 0,
      status: "active",
    });
    expect(service.updateLevel).toHaveBeenCalledWith("level-free", {
      code: "free",
      name: "Free",
      rank: 1,
      status: "active",
    });
    expect(service.deleteLevel).toHaveBeenCalledWith("level-free");
    expect(service.createPackageGroup).toHaveBeenCalledWith({
      billingCycle: "monthly",
      code: "monthly",
      durationDays: 30,
      name: "Monthly",
      sortWeight: 10,
      status: "active",
    });
    expect(service.updatePackageGroup).toHaveBeenCalledWith("group-monthly", {
      billingCycle: "monthly",
      code: "monthly",
      durationDays: 30,
      name: "Monthly",
      sortWeight: 11,
      status: "active",
    });
    expect(service.deletePackageGroup).toHaveBeenCalledWith("group-monthly");
    expect(service.assignPackagesToGroup).toHaveBeenCalledWith([], "group-monthly");
    expect(service.getDashboard).toHaveBeenCalledTimes(10);
  });
});
