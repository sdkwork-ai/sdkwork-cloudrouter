import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceRevenuePanel,
} from "../src";

describe("sdkwork-commerce-pc-commerce revenue panel", () => {
  it("renders revenue trend and product share analytics", () => {
    const RevenuePanel = SdkworkCommerceRevenuePanel;

    expect(RevenuePanel).toBeTypeOf("function");

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <RevenuePanel
          productPerformance={[
            {
              id: "product-pro-monthly",
              orderCount: 4,
              sharePercent: 62,
              title: "Pro Monthly",
              totalRevenueCny: 1999,
              trendDeltaPercent: 14.5,
            },
            {
              id: "product-pro-annual",
              orderCount: 2,
              sharePercent: 38,
              title: "Pro Annual",
              totalRevenueCny: 1200,
              trendDeltaPercent: -2.1,
            },
          ]}
          revenueTrend={[
            {
              averageOrderValueCny: 399,
              bucketKey: "2026-04-01",
              label: "Apr 01",
              orders: 2,
              revenueCny: 798,
            },
            {
              averageOrderValueCny: 600,
              bucketKey: "2026-04-02",
              label: "Apr 02",
              orders: 2,
              revenueCny: 1200,
            },
            {
              averageOrderValueCny: 500.5,
              bucketKey: "2026-04-03",
              label: "Apr 03",
              orders: 2,
              revenueCny: 1001,
            },
          ]}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByRole("heading", { name: /revenue trend/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /product revenue share/i })).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.getByText("Pro Annual")).toBeInTheDocument();
    expect(screen.getByText(/62% share/i)).toBeInTheDocument();
  });
});
