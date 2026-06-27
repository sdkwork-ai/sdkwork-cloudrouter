import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceFeaturedOffersPanel,
} from "../src";

describe("sdkwork-commerce-pc-commerce featured offers panel", () => {
  it("renders an empty state when no offers are available", () => {
    const FeaturedOffersPanel = SdkworkCommerceFeaturedOffersPanel;

    expect(FeaturedOffersPanel).toBeTypeOf("function");

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <FeaturedOffersPanel featuredOffers={[]} />
      </SdkworkThemeProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: /featured offers/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no featured offers are currently available/i)).toBeInTheDocument();
  });

  it("renders recommended commercial offers", () => {
    const FeaturedOffersPanel = SdkworkCommerceFeaturedOffersPanel;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <FeaturedOffersPanel
          featuredOffers={[
            {
              action: {
                capability: "subscription",
                intent: "upgrade",
                label: "Upgrade now",
                route: "/subscription?mode=upgrade&packageId=pro-annual",
              },
              description: "Annual membership with higher quotas.",
              estimatedSavingsCny: 300,
              group: "membership",
              id: "offer-membership-pro-annual",
              kind: "membership-upgrade",
              priceCny: 699,
              recommended: true,
              tags: ["Annual"],
              title: "Pro Annual",
            },
          ]}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Pro Annual")).toBeInTheDocument();
    expect(screen.getByText(/^Featured$/i)).toBeInTheDocument();
    expect(screen.queryByText(/includes/i)).not.toBeInTheDocument();
  });
});
