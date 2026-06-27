import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkSubscriptionIntlProvider,
  SdkworkSubscriptionPaymentMethods,
} from "../src";

describe("sdkwork-commerce-pc-subscription payment methods", () => {
  it("renders runtime-backed payment options and dispatches selected method ids", () => {
    const onSelectPaymentMethod = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionPaymentMethods
          methods={[
            {
              available: true,
              code: "WECHAT_PAY",
              description: "Scan to pay",
              id: "wechat-pay",
              kind: "qr",
              label: "WeChat Pay",
              paymentMethod: "WECHAT",
              productTypes: [
                {
                  available: true,
                  code: "native",
                  label: "Native",
                },
              ],
              recommended: true,
              recommendedProductType: "native",
            },
            {
              available: true,
              code: "ALIPAY",
              description: "Desktop payment",
              id: "alipay-pay",
              kind: "qr",
              label: "Alipay",
              paymentMethod: "ALIPAY",
              productTypes: [
                {
                  available: true,
                  code: "pc",
                  label: "PC Web",
                },
              ],
              recommended: false,
              recommendedProductType: "pc",
            },
          ]}
          onSelectPaymentMethod={onSelectPaymentMethod}
          selectedPaymentMethodId="wechat-pay"
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("WeChat Pay")).toBeInTheDocument();
    expect(screen.getByText("Alipay")).toBeInTheDocument();
    expect(screen.getByText(/scan to pay/i)).toBeInTheDocument();
    expect(screen.queryByText("WECHAT")).not.toBeInTheDocument();

    const selectedMethod = screen.getByRole("button", {
      name: /wechat pay/i,
    });
    expect(selectedMethod.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(selectedMethod.className).not.toContain("shadow-[0_12px_28px_rgba");

    const iconBubble = selectedMethod.querySelector("svg")?.parentElement as HTMLElement | null;
    expect(iconBubble).not.toBeNull();
    expect(iconBubble?.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(iconBubble?.className).not.toContain("bg-white/90");

    const productTypeBadge = screen.getByText("Native");
    expect(productTypeBadge.className).toContain("shadow-[var(--sdk-shadow-soft)]");
    expect(productTypeBadge.className).not.toContain("bg-white");

    fireEvent.click(
      screen.getByRole("button", {
        name: /alipay/i,
      }),
    );

    expect(onSelectPaymentMethod).toHaveBeenCalledWith("alipay-pay");
  });

  it("localizes fallback payment labels, product types, and descriptions for Chinese hosts", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkSubscriptionIntlProvider locale="zh-CN">
          <SdkworkSubscriptionPaymentMethods
            methods={[
              {
                available: true,
                code: "WECHAT_PAY",
                description: "Scan to pay",
                id: "wechat-pay",
                kind: "qr",
                label: "WeChat Pay",
                paymentMethod: "WECHAT",
                productTypes: [
                  {
                    available: true,
                    code: "native",
                    label: "Native",
                  },
                ],
                recommended: true,
                recommendedProductType: "native",
              },
              {
                available: true,
                code: "ALIPAY",
                description: "Desktop payment",
                id: "alipay-pay",
                kind: "qr",
                label: "Alipay",
                paymentMethod: "ALIPAY",
                productTypes: [
                  {
                    available: true,
                    code: "pc",
                    label: "PC Web",
                  },
                ],
                recommended: false,
                recommendedProductType: "pc",
              },
            ]}
            onSelectPaymentMethod={() => undefined}
            selectedPaymentMethodId="wechat-pay"
          />
        </SdkworkSubscriptionIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("微信支付")).toBeInTheDocument();
    expect(screen.getByText("支付宝")).toBeInTheDocument();
    expect(screen.getByText("扫码支付")).toBeInTheDocument();
    expect(screen.getByText("原生支付")).toBeInTheDocument();
    expect(screen.getByText("当前已选")).toBeInTheDocument();
  });
});
