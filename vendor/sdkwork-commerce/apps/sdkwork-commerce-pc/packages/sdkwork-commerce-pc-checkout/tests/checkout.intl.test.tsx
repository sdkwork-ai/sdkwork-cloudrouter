import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCheckoutPage,
  SdkworkCheckoutPaymentMethods,
  SdkworkCheckoutSummaryRail,
  SdkworkCheckoutIntlProvider,
} from "../src";

function createCatalog() {
  return {
    invoicePolicy: {
      available: true,
      enabledByDefault: true,
      title: "SDKWORK Technology",
      titleType: "company" as const,
    },
    isAuthenticated: true,
    paymentMethods: [
      {
        available: true,
        code: "WECHAT_PAY",
        description: "Scan to pay",
        id: "wechat-pay",
        kind: "qr" as const,
        label: "WeChat Pay",
        recommended: true,
      },
      {
        available: true,
        code: "ALIPAY",
        description: "Desktop payment",
        id: "alipay-pay",
        kind: "qr" as const,
        label: "Alipay",
        recommended: false,
      },
    ],
    sources: [
      {
        action: {
          capability: "subscription" as const,
          intent: "purchase" as const,
          label: "Activate membership",
          route: "/subscription?mode=purchase&packageId=101",
        },
        billingLabel: "Monthly",
        description: "Premium plan",
        id: "plan-pro",
        invoiceEligible: true,
        kind: "subscription" as const,
        meta: {
          action: "purchase",
          packageId: 101,
        },
        originalAmountCny: 59,
        quantity: 1,
        recommended: true,
        tags: ["creator"],
        title: "Pro Monthly",
        unitLabel: "seat",
      },
    ],
    userCoupons: [
      {
        discountAmountCny: 30,
        id: "user-coupon-subscription",
        label: "Launch Credit",
        minimumSpendCny: 50,
        sourceKinds: ["subscription" as const],
      },
    ],
    walletBalanceCny: 18,
  };
}

describe("sdkwork-commerce-pc-checkout intl", () => {
  it("renders Chinese page copy when checkout receives a Chinese locale", async () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutPage
          locale="zh-CN"
          service={{
            getCatalog: vi.fn().mockResolvedValue(createCatalog()),
            getEmptyCatalog: vi.fn().mockReturnValue({
              ...createCatalog(),
              invoicePolicy: {
                available: false,
                enabledByDefault: false,
                title: undefined,
                titleType: "personal" as const,
              },
              isAuthenticated: false,
              paymentMethods: [],
              sources: [],
              userCoupons: [],
              walletBalanceCny: 0,
            }),
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "结算中心",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新结算" })).toBeInTheDocument();
    expect(screen.getAllByText("支付方式").length).toBeGreaterThan(0);
    expect(screen.getByText("优惠券策略")).toBeInTheDocument();
  });

  it("applies host message overrides on top of the localized checkout seam", async () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutPage
          locale="zh-CN"
          messages={{
            page: {
              refresh: "重新结算",
              title: "商业结算驾驶舱",
            },
          }}
          service={{
            getCatalog: vi.fn().mockResolvedValue(createCatalog()),
            getEmptyCatalog: vi.fn().mockReturnValue({
              ...createCatalog(),
              invoicePolicy: {
                available: false,
                enabledByDefault: false,
                title: undefined,
                titleType: "personal" as const,
              },
              isAuthenticated: false,
              paymentMethods: [],
              sources: [],
              userCoupons: [],
              walletBalanceCny: 0,
            }),
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "商业结算驾驶舱",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重新结算" })).toBeInTheDocument();
  });

  it("lets standalone checkout components consume Chinese copy through the intl provider", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutIntlProvider locale="zh-CN">
          <SdkworkCheckoutPaymentMethods
            methods={[
              {
                available: true,
                code: "WECHAT_PAY",
                description: "Scan to pay",
                id: "wechat-pay",
                kind: "qr",
                label: "WeChat Pay",
                recommended: true,
              },
            ]}
            onSelectPaymentMethod={vi.fn()}
            selectedPaymentMethodId="wechat-pay"
          />
          <SdkworkCheckoutSummaryRail
            invoiceRequested
            isAuthenticated
            isMutating={false}
            onSubmit={vi.fn()}
            onToggleInvoiceRequested={vi.fn()}
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
        </SdkworkCheckoutIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getAllByText("支付方式").length).toBeGreaterThan(0);
    expect(screen.getByText("推荐")).toBeInTheDocument();
    expect(screen.getByText("当前已选")).toBeInTheDocument();
    expect(screen.getByText("结算摘要")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "已申请发票" })).toBeInTheDocument();
  });
});
