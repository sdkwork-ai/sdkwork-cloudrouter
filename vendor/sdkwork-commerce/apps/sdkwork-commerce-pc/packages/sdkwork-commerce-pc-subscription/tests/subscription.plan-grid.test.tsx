import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionPlanGrid } from "../src";

describe("sdkwork-commerce-pc-subscription plan grid", () => {
  it("renders a free membership comparison card beside paid plans", () => {
    const onSelectPlan = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPlanGrid
          benefits={[
            {
              claimed: true,
              id: "membership-benefit-2",
              name: "Priority rendering",
              usageLimit: 10,
              usedCount: 2,
            },
          ]}
          onSelectPlan={onSelectPlan}
          plans={[
            {
              description: "Best for professional creators.",
              durationDays: 30,
              id: "membership-plan-2",
              includedPoints: 5000,
              name: "Pro Monthly",
              originalPriceCny: null,
              packageId: 2,
              priceCny: 199,
              recommended: true,
              tags: ["Popular"],
            },
          ]}
          selectedPackageId={2}
          summary={{
            currentLevelName: "Free",
            currentLevelValue: 1,
            growthValue: 20,
            isAuthenticated: true,
            isMember: false,
            pointBalance: 100,
            remainingDays: null,
            status: "free" as const,
            totalSpent: 0,
            upgradeGrowthValue: 200,
            points: 20,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/free membership/i)).toBeInTheDocument();
    expect(screen.getByText(/compare free and premium/i)).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();

    const freeTierChip = screen.getByText(/entry tier/i);
    expect(freeTierChip.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(freeTierChip.className).not.toContain("bg-white");

    const selectedPackageCard = screen.getByText(/selected package/i).parentElement;
    expect(selectedPackageCard).not.toBeNull();
    expect(selectedPackageCard?.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(selectedPackageCard?.className).not.toContain("bg-white/80");
    expect(selectedPackageCard?.getAttribute("style")).toContain(
      "var(--sdk-color-brand-accent)",
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /selected/i,
      }),
    );

    expect(onSelectPlan).toHaveBeenCalledWith(2);
  });
});
