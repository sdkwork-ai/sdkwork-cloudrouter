import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkCheckoutSummaryRail } from "../src";

describe("sdkwork-commerce-pc-checkout summary rail", () => {
  it("renders source summary, invoice toggle, and submit action", () => {
    const onSubmit = vi.fn();
    const onToggleInvoiceRequested = vi.fn();

    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutSummaryRail
          invoiceRequested
          isAuthenticated
          isMutating={false}
          onSubmit={onSubmit}
          onToggleInvoiceRequested={onToggleInvoiceRequested}
          source={{
            action: {
              capability: "subscription",
              intent: "purchase",
              label: "Activate membership",
              route: "/subscription?mode=purchase&packageId=101",
            },
            billingLabel: "Monthly",
            description: "Premium plan",
            id: "plan-pro",
            invoiceEligible: true,
            kind: "subscription",
            originalAmountCny: 59,
            quantity: 1,
            recommended: true,
            tags: ["creator"],
            title: "Pro Monthly",
            unitLabel: "seat",
          }}
          summary={{
            balanceCoverageCny: 18,
            couponLabel: "Launch Credit",
            discountAmountCny: 30,
            invoiceEligible: true,
            invoiceRequested: true,
            originalAmountCny: 59,
            payableAmountCny: 29,
            paymentMethodLabel: "WeChat Pay",
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Checkout summary")).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.getByText("Launch Credit")).toBeInTheDocument();
    expect(screen.getByText(/amount due/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /invoice requested/i,
      }),
    );
    expect(onToggleInvoiceRequested).toHaveBeenCalledWith(false);

    fireEvent.click(
      screen.getByRole("button", {
        name: /activate membership/i,
      }),
    );
    expect(onSubmit).toHaveBeenCalled();
    expect(container.innerHTML).not.toContain("bg-white px-3");
  });

  it("disables paid submission when no payment method is selected", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutSummaryRail
          invoiceRequested={false}
          isAuthenticated
          isMutating={false}
          onSubmit={vi.fn()}
          onToggleInvoiceRequested={vi.fn()}
          source={{
            action: {
              capability: "points",
              intent: "recharge",
              label: "Recharge points",
              route: "/points?section=recharge",
            },
            billingLabel: "Points recharge",
            description: "Recharge points",
            id: "points-pack-1k",
            invoiceEligible: false,
            kind: "points-recharge",
            originalAmountCny: 9.9,
            quantity: 1000,
            recommended: true,
            tags: ["points"],
            title: "Starter Points 1K",
            unitLabel: "points",
          }}
          summary={{
            balanceCoverageCny: 0,
            couponLabel: null,
            discountAmountCny: 0,
            invoiceEligible: false,
            invoiceRequested: false,
            originalAmountCny: 9.9,
            payableAmountCny: 9.9,
            paymentMethodLabel: null,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      screen.getByRole("button", {
        name: /recharge points/i,
      }),
    ).toBeDisabled();
  });
});
