import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionSelectedPlanCard } from "../src";

describe("sdkwork-commerce-pc-subscription selected plan card", () => {
  it("renders a tokenized selected plan surface with reusable detail chips", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionSelectedPlanCard
          selectedPlan={{
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
          }}
        />
      </SdkworkThemeProvider>,
    );

    const card = screen.getByText(/selected package/i).parentElement;
    expect(card).not.toBeNull();
    expect(card?.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(card?.className).not.toContain("shadow-[0_16px_36px_rgba");

    const durationChip = screen.getByText(/30 days/i);
    expect(durationChip.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(durationChip.className).not.toContain("bg-white");
  });
});
