import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SdkworkEntitlementPage,
} from "../src";

describe("sdkwork-commerce-pc-entitlement page", () => {
  it("renders the entitlement center, filters attention decisions, and routes the selected commercial action through onNavigate", async () => {
    const Page = SdkworkEntitlementPage;
    const onNavigate = vi.fn();

    expect(Page).toBeTypeOf("function");

    const service = {
      getEmptyDashboard: vi.fn().mockReturnValue({
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
      }),
      getDashboard: vi.fn().mockResolvedValue({
        decisions: [
          {
            category: "assistant",
            description: "Top-tier reasoning and coding models.",
            id: "premium-models",
            isAvailable: false,
            isNearLimit: false,
            reasonCodes: ["minimum-level"],
            recommendedAction: {
              capability: "subscription",
              label: "Open upgrade",
              route: "/subscription?mode=upgrade",
            },
            status: "upgrade-required",
            tags: ["Premium"],
            title: "Premium Models",
          },
          {
            category: "generation",
            description: "High-throughput rendering with limited balance.",
            id: "batch-render",
            isAvailable: false,
            isNearLimit: false,
            reasonCodes: ["insufficient-points"],
            recommendedAction: {
              capability: "points",
              label: "Open recharge",
              route: "/points?section=recharge",
            },
            status: "recharge-required",
            tags: ["Credits"],
            title: "Batch Render",
          },
          {
            category: "automation",
            description: "Automation quota is close to its cap.",
            id: "agent-automation",
            isAvailable: true,
            isNearLimit: true,
            reasonCodes: ["quota-near-limit"],
            recommendedAction: {
              capability: "offer",
              label: "Review upgrade options",
              route: "/offers?group=membership",
            },
            remainingQuota: 14,
            status: "limited",
            tags: ["Quota"],
            title: "Agent Automation",
            usageRatio: 0.86,
          },
        ],
        digest: {
          attentionCapabilities: 3,
          limitedCapabilities: 1,
          lockedCapabilities: 0,
          readyCapabilities: 0,
          rechargeRequiredCapabilities: 1,
          totalCapabilities: 3,
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
          capability: "subscription",
          label: "Open upgrade",
          route: "/subscription?mode=upgrade",
        },
      }),
    };

    render(<Page onNavigate={onNavigate} service={service} />);

    expect(
      await screen.findByRole("heading", {
        name: /entitlement center/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Premium Models")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /attention/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /premium models/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /open upgrade/i,
      }),
    );

    expect(onNavigate).toHaveBeenCalledWith("/subscription?mode=upgrade");
  });

  it("threads locale-aware default controller copy through the entitlement page shell before dashboard data resolves", async () => {
    const Page = SdkworkEntitlementPage;

    render(
      <Page
        locale="zh-CN"
        service={{
          getDashboard: vi.fn().mockImplementation(
            () => new Promise(() => undefined),
          ),
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "权益中心",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/访客/)).toBeInTheDocument();
  });
});
