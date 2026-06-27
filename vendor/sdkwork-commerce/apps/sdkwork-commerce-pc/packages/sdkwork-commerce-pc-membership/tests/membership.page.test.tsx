import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkMembershipPage, createSdkworkMembershipController } from "../src";

describe("sdkwork-commerce-pc-membership page", () => {
  it("renders the reusable membership center with plans, benefits, and level comparison", async () => {
    const controller = createSdkworkMembershipController({
      service: {
        getDashboard: vi.fn().mockResolvedValue({
          benefits: [
            {
              claimed: true,
              description: "Jump the queue for premium workloads.",
              id: "membership-benefit-2",
              name: "Priority rendering",
              type: "quota",
              usageLimit: 10,
              usedCount: 2,
            },
          ],
          levels: [
            {
              description: "Professional tier",
              id: "membership-level-3",
              isCurrent: true,
              levelValue: 3,
              name: "Pro",
              requiredPoints: 500,
            },
          ],
          plans: [
            {
              description: "Best for teams",
              durationDays: 365,
              id: "membership-package-3",
              includedPoints: 60000,
              name: "Pro Annual",
              packageId: 3,
              priceCny: 699,
              recommended: true,
              tags: ["Annual"],
            },
          ],
          summary: {
            currentLevelName: "Pro",
            currentLevelValue: 3,
            growthValue: 180,
            isAuthenticated: true,
            isMember: true,
            pointBalance: 2400,
            remainingDays: 88,
            status: "active" as const,
            totalSpent: 399,
            upgradeGrowthValue: 500,
            points: 3200,
          },
        }),
        getEmptyDashboard: vi.fn().mockReturnValue({
          benefits: [],
          levels: [],
          plans: [],
          summary: {
            currentLevelName: "Guest",
            currentLevelValue: null,
            growthValue: null,
            isAuthenticated: false,
            isMember: false,
            pointBalance: null,
            remainingDays: null,
            status: "guest" as const,
            totalSpent: null,
            upgradeGrowthValue: null,
            points: null,
          },
        }),
        purchaseMembership: vi.fn(),
        renewMembership: vi.fn(),
        upgradeMembership: vi.fn(),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkMembershipPage controller={controller} />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /membership center/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /upgrade now/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Priority rendering")).toBeInTheDocument();
    expect(screen.getAllByText("Pro Annual").length).toBeGreaterThan(0);
  });
});
