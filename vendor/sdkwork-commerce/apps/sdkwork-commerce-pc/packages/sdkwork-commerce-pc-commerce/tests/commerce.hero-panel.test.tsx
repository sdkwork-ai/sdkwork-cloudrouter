import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceHeroPanel,
} from "../src";

describe("sdkwork-commerce-pc-commerce hero panel", () => {
  it("renders premium commerce summary metrics", () => {
    const HeroPanel = SdkworkCommerceHeroPanel;

    expect(HeroPanel).toBeTypeOf("function");

    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <HeroPanel
          summary={{
            actionablePayments: 2,
            availableCoupons: 5,
            availablePaymentMethods: 4,
            availablePoints: 12800,
            bestOfferSavingsCny: 320,
            claimableCoupons: 3,
            claimedBenefits: 6,
            currentLevelName: "Pro",
            expiringSoonCoupons: 1,
            featuredOffers: 7,
            invoiceActionRequired: 2,
            invoicePendingCount: 4,
            isAuthenticated: true,
            pendingPaymentOrders: 1,
            totalOrders: 42,
            totalSpentCny: 1299,
            membershipRemainingDays: 38,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: /commerce hub/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText(/available points/i)).toBeInTheDocument();
    expect(screen.getByText(/claimed benefits/i)).toBeInTheDocument();
    expect(screen.getByText(/payment methods/i)).toBeInTheDocument();
    expect(screen.getByText(/available coupons/i)).toBeInTheDocument();
    expect(screen.getByText(/38 days/i)).toBeInTheDocument();
    expect(screen.getByText(/authenticated/i)).toBeInTheDocument();

    const hero = screen.getByRole("heading", {
      name: /commerce hub/i,
    }).closest("div[style]");

    expect(hero).not.toBeNull();
    expect(hero?.className).not.toContain("border-white/10");
    expect(hero?.getAttribute("style")).toContain("var(--sdk-color-surface-canvas)");
    expect(hero?.getAttribute("style")).not.toContain("#18181b");

    const glassSurfaces = Array.from(container.querySelectorAll("[style]")).filter((element) =>
      element.getAttribute("style")?.includes("var(--sdk-color-surface-panel) 18%"),
    );

    expect(glassSurfaces.length).toBeGreaterThanOrEqual(4);
  });
});
