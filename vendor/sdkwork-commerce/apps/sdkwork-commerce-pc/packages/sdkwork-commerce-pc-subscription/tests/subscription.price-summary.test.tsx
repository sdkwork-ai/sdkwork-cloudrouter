import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkSubscriptionPriceSummary } from "../src";

describe("sdkwork-commerce-pc-subscription price summary", () => {
  it("renders tokenized summary panels for due amounts and payment rails", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPriceSummary
          checkout={{
            action: "upgrade",
            discountAmountCny: 50,
            originalAmountCny: 199,
            payableAmountCny: 149,
            selectedCouponId: "user-coupon-UC-200",
            selectedPackageId: 2,
            selectedPaymentMethodCode: "WECHAT_PAY",
            selectedPaymentMethodId: "wechat-pay",
          }}
          paymentMethodLabel="WeChat Pay"
        />
      </SdkworkThemeProvider>,
    );

    const summary = screen.getByText(/original price/i).parentElement?.parentElement;
    expect(summary).not.toBeNull();
    expect(summary?.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(summary?.className).not.toContain("shadow-[0_12px_28px_rgba");

    const amountDuePanel = screen.getByText(/amount due/i).parentElement?.parentElement;
    expect(amountDuePanel).not.toBeNull();
    expect(amountDuePanel?.className).toContain("shadow-[var(--sdk-shadow-soft)]");
  });
});
