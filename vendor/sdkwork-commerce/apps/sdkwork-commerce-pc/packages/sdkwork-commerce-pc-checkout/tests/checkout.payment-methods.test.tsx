import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkCheckoutPaymentMethods } from "../src";

describe("sdkwork-commerce-pc-checkout payment methods", () => {
  it("renders payment methods, highlights the active option, and dispatches selection", () => {
    const onSelectPaymentMethod = vi.fn();

    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
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
            {
              available: true,
              code: "ALIPAY",
              description: "Desktop payment",
              id: "alipay-pay",
              kind: "qr",
              label: "Alipay",
              recommended: false,
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

    fireEvent.click(
      screen.getByRole("button", {
        name: /alipay/i,
      }),
    );

    expect(onSelectPaymentMethod).toHaveBeenCalledWith("alipay-pay");
    expect(container.innerHTML).not.toContain("bg-white/90");
    expect(container.innerHTML).not.toContain("shadow-[0_18px_48px_rgba(15,23,42,0.08)]");
  });
});
