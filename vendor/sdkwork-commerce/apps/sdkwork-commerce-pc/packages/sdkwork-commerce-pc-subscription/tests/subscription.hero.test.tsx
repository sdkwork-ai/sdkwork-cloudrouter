import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionHero } from "../src";

const summary = {
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

describe("sdkwork-commerce-pc-subscription hero", () => {
  it("renders a tokenized Sdkwork-style hero shell and helper-driven stat cards", () => {
    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionHero
          activeAction="upgrade"
          couponCount={2}
          onActionChange={vi.fn()}
          planCount={3}
          summary={summary}
        />
      </SdkworkThemeProvider>,
    );

    const hero = screen.getByRole("heading", {
      level: 1,
      name: /subscription center/i,
    }).closest("section");
    expect(hero).not.toBeNull();
    expect(hero?.className).toContain("shadow-[var(--sdk-shadow-lg)]");
    expect(hero?.className).not.toContain("border-white/10");

    const currentLevelCard = screen.getByText(/current level/i).parentElement;
    expect(currentLevelCard).not.toBeNull();
    expect(currentLevelCard?.className).toContain("shadow-[var(--sdk-shadow-sm)]");
    expect(currentLevelCard?.className).not.toContain("bg-white/8");
    expect(currentLevelCard?.getAttribute("style")).toContain(
      "var(--sdk-color-brand-primary)",
    );
    expect(container.innerHTML).not.toContain("text-white/74");
    expect(container.innerHTML).not.toContain("text-white/68");
  });
});
