import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceAnalyticsSummaryPanel,
} from "../src";

describe("sdkwork-commerce-pc-commerce analytics summary", () => {
  it("renders revenue, order throughput, and alert posture metrics", () => {
    const AnalyticsSummary = SdkworkCommerceAnalyticsSummaryPanel;

    expect(AnalyticsSummary).toBeTypeOf("function");

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <AnalyticsSummary
          summary={{
            activeAlerts: 2,
            averageOrderValueCny: 333.22,
            totalRevenueCny: 2999,
            totalRevenueRecords: 9,
            totalSuccessfulOrders: 8,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/revenue command/i)).toBeInTheDocument();
    expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/average order value/i)).toBeInTheDocument();
    expect(screen.getByText(/successful orders/i)).toBeInTheDocument();
    expect(screen.getByText(/active alerts/i)).toBeInTheDocument();
  });
});
