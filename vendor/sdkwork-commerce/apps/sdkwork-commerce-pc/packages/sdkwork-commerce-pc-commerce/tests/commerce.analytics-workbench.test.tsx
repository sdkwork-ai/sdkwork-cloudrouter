import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceAnalyticsWorkbench,
} from "../src";

describe("sdkwork-commerce-pc-commerce analytics workbench", () => {
  it("renders revenue records, product performance rows, and alerts", () => {
    const AnalyticsWorkbench = SdkworkCommerceAnalyticsWorkbench;

    expect(AnalyticsWorkbench).toBeTypeOf("function");

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <AnalyticsWorkbench
          alerts={[
            {
              description: "1 invoice requires manual processing.",
              id: "invoices-action-required",
              metric: "1 invoice",
              severity: "danger",
              title: "Invoice action required",
            },
          ]}
          productPerformance={[
            {
              id: "product-pro-monthly",
              orderCount: 4,
              sharePercent: 62,
              title: "Pro Monthly",
              totalRevenueCny: 1999,
              trendDeltaPercent: 14.5,
            },
          ]}
          recentRevenueRecords={[
            {
              amountCny: 699,
              channel: "WECHAT_PAY",
              id: "ORDER-300",
              orderNo: "ORDER-300",
              productTitle: "Pro Annual",
              status: "success",
              timestamp: "2026-04-03T09:05:00.000Z",
            },
          ]}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByRole("heading", { name: /analytics workbench/i })).toBeInTheDocument();
    expect(screen.getByText(/recent revenue records/i)).toBeInTheDocument();
    expect(screen.getByText(/product performance/i)).toBeInTheDocument();
    expect(screen.getByText(/operator alerts/i)).toBeInTheDocument();
    expect(screen.getByText("Pro Annual")).toBeInTheDocument();
    expect(screen.getByText("Invoice action required")).toBeInTheDocument();
  });
});
