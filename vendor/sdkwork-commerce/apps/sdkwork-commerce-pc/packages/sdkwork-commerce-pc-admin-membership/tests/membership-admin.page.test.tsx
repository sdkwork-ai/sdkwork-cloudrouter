import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createSdkworkMembershipAdminController, SdkworkMembershipAdminPage } from "../src";

describe("sdkwork-commerce-pc-admin-membership page", () => {
  it("renders the standard admin membership workspace with package group operations and assignment controls", () => {
    const controller = createSdkworkMembershipAdminController({
      initialState: {
        activeView: "packages",
        dashboard: {
          entitlements: [
            {
              code: "priority-rendering",
              id: "entitlement-1",
              levelId: "level-pro",
              membershipId: "membership-1",
              quota: "10",
              status: "active",
            },
          ],
          levels: [
            {
              benefits: [],
              code: "pro",
              id: "level-pro",
              name: "Pro",
              rank: 20,
              status: "active",
            },
          ],
          memberships: [
            {
              expiresAt: "2027-01-01T00:00:00Z",
              id: "membership-1",
              levelCode: "pro",
              ownerUserId: "user-1",
              startedAt: "2026-01-01T00:00:00Z",
              status: "active",
            },
          ],
          packageGroups: [
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
            {
              billingCycle: "annual",
              code: "annual",
              description: "Annual membership package group",
              durationDays: 365,
              id: "group-annual",
              name: "Annual",
              sortWeight: 20,
              status: "active",
            },
          ],
          packages: [
            {
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
          summary: {
            activeMemberships: 1,
            enabledPackages: 2,
            entitlements: 1,
            levels: 1,
            memberships: 1,
            packageGroups: 2,
            packages: 2,
          },
        },
        isBootstrapped: true,
      },
      service: {
        getDashboard: vi.fn(),
      },
    });

    render(<SdkworkMembershipAdminPage controller={controller} />);

    expect(screen.getByRole("heading", { name: "Membership Admin" })).toBeInTheDocument();
    expect(screen.getAllByText("Packages").length).toBeGreaterThan(0);
    expect(screen.getByText("Package groups")).toBeInTheDocument();
    expect(screen.getAllByText("Monthly").length).toBeGreaterThan(0);
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.queryByText("Pro Annual")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Annual/ }));

    expect(screen.getByText("Pro Annual")).toBeInTheDocument();
    expect(screen.queryByText("Pro Monthly")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add package to group" }));

    expect(screen.getByRole("dialog", { name: "Add packages to Annual" })).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
  });

  it("submits professional level, package, package group, and membership mutations through the controller", async () => {
    const controller = createSdkworkMembershipAdminController({
      initialState: {
        activeView: "levels",
        dashboard: {
          entitlements: [],
          levels: [
            {
              benefits: [],
              code: "pro",
              id: "level-pro",
              name: "Pro",
              rank: 20,
              status: "active",
            },
          ],
          memberships: [
            {
              expiresAt: "2027-01-01T00:00:00Z",
              id: "membership-1",
              levelCode: "pro",
              ownerUserId: "user-1",
              startedAt: "2026-01-01T00:00:00Z",
              status: "active",
            },
          ],
          packageGroups: [
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
          packages: [
            {
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
          ],
          summary: {
            activeMemberships: 1,
            enabledPackages: 1,
            entitlements: 0,
            levels: 1,
            memberships: 1,
            packageGroups: 1,
            packages: 1,
          },
        },
        isBootstrapped: true,
      },
      service: {
        getDashboard: vi.fn(),
      },
    });
    const createLevel = vi.spyOn(controller, "createLevel").mockResolvedValue(controller.getState());
    const updatePackage = vi.spyOn(controller, "updatePackage").mockResolvedValue(controller.getState());
    const createPackageGroup = vi.spyOn(controller, "createPackageGroup").mockResolvedValue(controller.getState());
    const updateMembershipStatus = vi.spyOn(controller, "updateMembershipStatus").mockResolvedValue({
      expiresAt: "2027-01-01T00:00:00Z",
      id: "membership-1",
      levelCode: "pro",
      ownerUserId: "user-1",
      startedAt: "2026-01-01T00:00:00Z",
      status: "suspended",
    });

    render(<SdkworkMembershipAdminPage controller={controller} />);

    fireEvent.click(screen.getByRole("button", { name: "New level" }));
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "team" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Team" } });
    fireEvent.change(screen.getByLabelText("Rank"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "Create membership level" }));

    await waitFor(() => expect(createLevel).toHaveBeenCalledWith({
      code: "team",
      name: "Team",
      rank: 30,
      status: "active",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Packages" }));
    fireEvent.click(within(screen.getByText("Pro Monthly").closest("tr") as HTMLElement).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Price"), { target: { value: "299.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save package" }));

    await waitFor(() => expect(updatePackage).toHaveBeenCalledWith("package-pro-monthly", {
      code: "pro-monthly",
      currencyCode: "CNY",
      durationDays: 30,
      groupId: "group-monthly",
      levelId: "level-pro",
      name: "Pro Monthly",
      priceAmount: "299.00",
      status: "active",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Create group" }));
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "annual" } });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Annual" } });
    fireEvent.change(screen.getByLabelText("Billing cycle"), { target: { value: "annual" } });
    fireEvent.change(screen.getByLabelText("Duration days"), { target: { value: "365" } });
    fireEvent.change(screen.getByLabelText("Sort weight"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Save group" }));

    await waitFor(() => expect(createPackageGroup).toHaveBeenCalledWith({
      billingCycle: "annual",
      code: "annual",
      description: null,
      durationDays: 365,
      name: "Annual",
      sortWeight: 20,
      status: "active",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Memberships" }));
    fireEvent.change(screen.getByLabelText("Membership status for membership-1"), {
      target: { value: "suspended" },
    });

    await waitFor(() => expect(updateMembershipStatus).toHaveBeenCalledWith("membership-1", {
      status: "suspended",
    }));
  });
});
