import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkMembershipIntlProvider,
  SdkworkMembershipMembershipHero,
  SdkworkMembershipPage,
  createSdkworkMembershipController,
} from "../src";

function createDashboard() {
  return {
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
        id: "membership-plan-3",
        includedPoints: 60000,
        name: "Pro Annual",
        originalPriceCny: 899,
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
  };
}

function createEmptyDashboard() {
  return {
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
  };
}

function createController() {
  return createSdkworkMembershipController({
    service: {
      getDashboard: vi.fn().mockResolvedValue(createDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
      purchaseMembership: vi.fn(),
      renewMembership: vi.fn(),
      upgradeMembership: vi.fn(),
    },
  });
}

describe("sdkwork-commerce-pc-membership intl", () => {
  it("renders Chinese copy across the membership page when a Chinese locale is provided", async () => {
    const MembershipPage = SdkworkMembershipPage;
    const controller = createController();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <MembershipPage controller={controller} locale="zh-CN" />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "会员中心",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即升级" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "权益" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "会员方案" })).toBeInTheDocument();
  });

  it("applies host message overrides on top of the localized membership seam", async () => {
    const MembershipPage = SdkworkMembershipPage;
    const controller = createController();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <MembershipPage
          controller={controller}
          locale="zh-CN"
          messages={{
            hero: {
              title: "Host membership cockpit",
            },
            actions: {
              renew: "Renew from host",
            },
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Host membership cockpit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew from host" })).toBeInTheDocument();
  });

  it("falls back to built-in English copy for standalone membership components without a host intl provider", () => {
    const MembershipMembershipHero = SdkworkMembershipMembershipHero;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <MembershipMembershipHero
          isMutating={false}
          onPurchase={vi.fn()}
          onRenew={vi.fn()}
          onUpgrade={vi.fn()}
          selectedPlan={createDashboard().plans[0]}
          summary={createDashboard().summary}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Membership")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upgrade now/i })).toBeInTheDocument();
    expect(screen.getByText("Current level")).toBeInTheDocument();
  });

  it("lets standalone membership components consume Chinese copy through the intl provider", () => {
    const MembershipIntlProvider = SdkworkMembershipIntlProvider;
    const MembershipMembershipHero = SdkworkMembershipMembershipHero;

    expect(MembershipIntlProvider).toBeTypeOf("function");

    if (typeof MembershipIntlProvider !== "function") {
      return;
    }

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <MembershipIntlProvider locale="zh-CN">
          <MembershipMembershipHero
            isMutating={false}
            onPurchase={vi.fn()}
            onRenew={vi.fn()}
            onUpgrade={vi.fn()}
            selectedPlan={createDashboard().plans[0]}
            summary={createDashboard().summary}
          />
        </MembershipIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getAllByText("会员").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "立即升级" })).toBeInTheDocument();
    expect(screen.getByText("当前等级")).toBeInTheDocument();
  });
});
