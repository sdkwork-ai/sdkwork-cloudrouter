import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkMembershipMembershipHero } from "../src";

function createSummary() {
  return {
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
  };
}

function createPlan() {
  return {
    description: "Best for teams",
    durationDays: 365,
    id: "membership-package-3",
    includedPoints: 60000,
    name: "Pro Annual",
    originalPriceCny: 899,
    packageId: 3,
    priceCny: 699,
    recommended: true,
    tags: ["Annual"],
  };
}

describe("sdkwork-commerce-pc-membership membership hero", () => {
  it("renders the shared sdkwork-style hero recipe and glass surfaces for primary membership summary cards", () => {
    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkMembershipMembershipHero
          isMutating={false}
          onPurchase={vi.fn()}
          onRenew={vi.fn()}
          onUpgrade={vi.fn()}
          selectedPlan={createPlan()}
          summary={createSummary()}
        />
      </SdkworkThemeProvider>,
    );

    const hero = screen.getByRole("heading", {
      level: 1,
      name: /membership center/i,
    }).closest("section");

    expect(hero).not.toBeNull();
    expect(hero?.className).not.toContain("border-white/10");
    expect(hero?.getAttribute("style")).toContain("var(--sdk-color-surface-canvas)");
    expect(hero?.getAttribute("style")).toContain("var(--sdk-color-surface-panel)");
    expect(hero?.getAttribute("style")).not.toContain("#18181b");

    const glassSurfaces = Array.from(container.querySelectorAll("[style]")).filter((element) =>
      element.getAttribute("style")?.includes("var(--sdk-color-surface-panel) 18%"),
    );

    expect(glassSurfaces.length).toBeGreaterThanOrEqual(2);
  });
});
