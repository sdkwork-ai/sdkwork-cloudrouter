import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkBillingSummaryCards } from "../src";

describe("sdkwork-commerce-pc-billing summary cards", () => {
  it("renders spend, projection, budget, and posture metrics", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkBillingSummaryCards
          digest={{
            budgetAmountCny: 120,
            budgetRemainingCny: 20,
            monthSpendCny: 100,
            outstandingAmountCny: 90,
            projectedMonthSpendCny: 200,
            savingsOpportunityCny: 300,
            todaySpendCny: 40,
          }}
          posture="over-budget"
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/today spend/i)).toBeInTheDocument();
    expect(screen.getByText(/month spend/i)).toBeInTheDocument();
    expect(screen.getByText(/projected month/i)).toBeInTheDocument();
    expect(screen.getByText(/budget remaining/i)).toBeInTheDocument();
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
  });
});
