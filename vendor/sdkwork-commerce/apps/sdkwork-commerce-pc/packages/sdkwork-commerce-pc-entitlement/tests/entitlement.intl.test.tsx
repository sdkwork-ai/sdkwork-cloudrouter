import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SdkworkEntitlementGate,
  SdkworkEntitlementIntlProvider,
  SdkworkEntitlementPage,
  createSdkworkEntitlementController,
} from "../src";

function createDashboard() {
  return {
    decisions: [
      {
        category: "assistant",
        description: "Premium reasoning and coding models.",
        id: "premium-models",
        isAvailable: false,
        isNearLimit: false,
        reasonCodes: ["minimum-level"],
        recommendedAction: {
          capability: "subscription" as const,
          intent: "upgrade" as const,
          label: "Open upgrade",
          route: "/subscription?mode=upgrade",
        },
        status: "upgrade-required" as const,
        tags: ["Premium"],
        title: "Premium Models",
      },
    ],
    digest: {
      attentionCapabilities: 1,
      limitedCapabilities: 0,
      lockedCapabilities: 0,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 0,
      totalCapabilities: 1,
      upgradeRequiredCapabilities: 1,
    },
    inventory: {
      availablePoints: 2400,
      currentLevelName: "Pro",
      currentLevelValue: 3,
      featuredOfferCount: 1,
      isAuthenticated: true,
      subscriptionPlanCount: 2,
      membershipRemainingDays: 18,
    },
    topAction: {
      capability: "subscription" as const,
      intent: "upgrade" as const,
      label: "Open upgrade",
      route: "/subscription?mode=upgrade",
    },
  };
}

function createEmptyDashboard() {
  return {
    decisions: [],
    digest: {
      attentionCapabilities: 0,
      limitedCapabilities: 0,
      lockedCapabilities: 0,
      readyCapabilities: 0,
      rechargeRequiredCapabilities: 0,
      totalCapabilities: 0,
      upgradeRequiredCapabilities: 0,
    },
    inventory: {
      availablePoints: 0,
      currentLevelName: "Guest",
      currentLevelValue: null,
      featuredOfferCount: 0,
      isAuthenticated: false,
      subscriptionPlanCount: 0,
      membershipRemainingDays: null,
    },
    topAction: null,
  };
}

describe("sdkwork-commerce-pc-entitlement intl", () => {
  it("renders Chinese copy across entitlement page surfaces when locale is zh-CN", async () => {
    const controller = createSdkworkEntitlementController({
      service: {
        getDashboard: vi.fn().mockResolvedValue(createDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
      },
    });

    render(<SdkworkEntitlementPage controller={controller} locale="zh-CN" />);

    expect(
      await screen.findByRole("heading", {
        name: "\u6743\u76ca\u4e2d\u5fc3",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "\u8bbf\u95ee\u72b6\u6001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u5f85\u5904\u7406" })).toBeInTheDocument();
  });

  it("applies host message overrides on top of localized entitlement copy", async () => {
    const controller = createSdkworkEntitlementController({
      service: {
        getDashboard: vi.fn().mockResolvedValue(createDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
      },
    });

    render(
      <SdkworkEntitlementPage
        controller={controller}
        locale="zh-CN"
        messages={{
          page: {
            title: "Host entitlement cockpit",
          },
          actions: {
            refresh: "Sync entitlement",
          },
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Host entitlement cockpit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync entitlement" })).toBeInTheDocument();
  });

  it("falls back to built-in English gate copy without an intl provider", () => {
    render(
      <SdkworkEntitlementGate
        decision={{
          category: "assistant",
          id: "premium-models",
          isAvailable: false,
          isNearLimit: false,
          reasonCodes: ["minimum-level"],
          recommendedAction: null,
          remainingQuota: null,
          status: "upgrade-required",
          tags: ["Premium"],
          title: "Premium Models",
          usageRatio: null,
        }}
      >
        <div>Protected content</div>
      </SdkworkEntitlementGate>,
    );

    expect(screen.getByText("Commercial Access")).toBeInTheDocument();
    expect(screen.getByText("Commercial posture")).toBeInTheDocument();
  });

  it("lets standalone gate consume Chinese copy through entitlement intl provider", () => {
    const onNavigate = vi.fn();

    render(
      <SdkworkEntitlementIntlProvider locale="zh-CN">
        <SdkworkEntitlementGate
          decision={{
            category: "generation",
            id: "batch-render",
            isAvailable: false,
            isNearLimit: false,
            reasonCodes: ["insufficient-points"],
            recommendedAction: {
              capability: "points",
              intent: "recharge",
              label: "Open recharge",
              route: "/points?section=recharge",
            },
            remainingQuota: null,
            status: "recharge-required",
            tags: ["Render"],
            title: "Batch Render",
            usageRatio: null,
          }}
          onNavigate={onNavigate}
        >
          <div>Protected content</div>
        </SdkworkEntitlementGate>
      </SdkworkEntitlementIntlProvider>,
    );

    expect(screen.getByText("\u5546\u4e1a\u8bbf\u95ee")).toBeInTheDocument();
    expect(screen.getByText("\u5546\u4e1a\u72b6\u6001")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open recharge" }));
    expect(onNavigate).toHaveBeenCalledWith("/points?section=recharge");
  });
});
