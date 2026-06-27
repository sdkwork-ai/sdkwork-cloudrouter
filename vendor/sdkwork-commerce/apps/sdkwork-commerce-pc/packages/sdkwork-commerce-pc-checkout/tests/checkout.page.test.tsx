import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  createSdkworkCheckoutBackdropStyle,
  createSdkworkCheckoutHeroStyle,
  createSdkworkCheckoutPanelStyle,
  SdkworkCheckoutPage,
} from "../src";

function createCatalog() {
  return {
    invoicePolicy: {
      available: true,
      enabledByDefault: true,
      title: "SDKWORK Technology",
      titleType: "company",
    },
    isAuthenticated: true,
    paymentMethods: [
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
    ],
    sources: [
      {
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
      {
        action: {
          capability: "wallet",
          intent: "recharge",
          label: "Recharge wallet",
          route: "/wallet?section=recharge",
        },
        billingLabel: "One-time recharge",
        description: "Wallet recharge package",
        id: "wallet-pack-12000",
        invoiceEligible: false,
        kind: "wallet-recharge",
        meta: {
          points: 12000,
        },
        originalAmountCny: 99,
        quantity: 12000,
        recommended: false,
        tags: ["credits"],
        title: "Studio Credits 12K",
        unitLabel: "points",
      },
    ],
    userCoupons: [
      {
        discountAmountCny: 30,
        id: "user-coupon-subscription",
        label: "Launch Credit",
        minimumSpendCny: 50,
        sourceKinds: ["subscription"],
      },
      {
        discountAmountCny: 12,
        id: "user-coupon-wallet",
        label: "Recharge Coupon",
        minimumSpendCny: 80,
        sourceKinds: ["wallet-recharge"],
      },
    ],
    walletBalanceCny: 18,
  };
}

describe("sdkwork-commerce-pc-checkout page", () => {
  it("renders the checkout center, switches source and payment method, and routes after submit", async () => {
    const onNavigate = vi.fn();

    const submitCheckout = vi.fn().mockResolvedValue({
      amountCny: 87,
      nextRoute: "/payments?paymentId=PAY-9901&orderId=ORDER-9901",
      orderId: "ORDER-9901",
      paymentId: "PAY-9901",
      status: "requires-payment",
    });

    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutPage
          onNavigate={onNavigate}
          service={{
            getCatalog: vi.fn().mockResolvedValue(createCatalog()),
            getEmptyCatalog: vi.fn().mockReturnValue({
              ...createCatalog(),
              invoicePolicy: {
                available: false,
                enabledByDefault: false,
                title: undefined,
                titleType: "personal",
              },
              isAuthenticated: false,
              paymentMethods: [],
              sources: [],
              userCoupons: [],
              walletBalanceCny: 0,
            }),
            submitCheckout,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /checkout center/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Pro Monthly").length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", {
        name: /studio credits 12k/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /alipay/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /recharge wallet/i,
      }),
    );

    await waitFor(() => {
      expect(submitCheckout).toHaveBeenCalledWith({
        invoiceRequested: false,
        selectedCouponId: "user-coupon-wallet",
        selectedPaymentMethodId: "alipay-pay",
        sourceId: "wallet-pack-12000",
      });
    });
    expect(onNavigate).toHaveBeenCalledWith("/payments?paymentId=PAY-9901&orderId=ORDER-9901");
    expect(container.innerHTML).not.toContain("border-white/10");
    expect(container.innerHTML).not.toContain("bg-white/10");
    expect(container.innerHTML).not.toContain("bg-white/8");
    expect(container.innerHTML).not.toContain("text-white/72");
    expect(container.innerHTML).not.toContain("text-white/65");
    expect(container.innerHTML).not.toContain("shadow-[0_24px_72px_rgba(15,23,42,0.2)]");
    expect(container.innerHTML).not.toContain("shadow-[0_18px_48px_rgba(15,23,42,0.08)]");
  });

  it("does not navigate when checkout submission fails", async () => {
    const onNavigate = vi.fn();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutPage
          onNavigate={onNavigate}
          service={{
            getCatalog: vi.fn().mockResolvedValue(createCatalog()),
            getEmptyCatalog: vi.fn().mockReturnValue({
              ...createCatalog(),
              isAuthenticated: false,
              paymentMethods: [],
              sources: [],
              userCoupons: [],
              walletBalanceCny: 0,
            }),
            submitCheckout: vi.fn().mockResolvedValue({
              amountCny: 59,
              nextRoute: undefined,
              status: "failed",
            }),
          }}
        />
      </SdkworkThemeProvider>,
    );

    await screen.findByRole("heading", {
      name: /checkout center/i,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /activate membership/i,
      }),
    );

    await waitFor(() => {
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  it("uses checkout appearance seam helpers for backdrop, hero, and source cards", async () => {
    const { container } = render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCheckoutPage
          service={{
            getCatalog: vi.fn().mockResolvedValue(createCatalog()),
            getEmptyCatalog: vi.fn().mockReturnValue({
              ...createCatalog(),
              isAuthenticated: false,
              paymentMethods: [],
              sources: [],
              userCoupons: [],
              walletBalanceCny: 0,
            }),
            submitCheckout: vi.fn().mockResolvedValue({
              amountCny: 59,
              nextRoute: undefined,
              status: "failed",
            }),
          }}
        />
      </SdkworkThemeProvider>,
    );

    await screen.findByRole("heading", {
      name: /checkout center/i,
    });

    const halo = container.querySelector(".pointer-events-none") as HTMLDivElement | null;
    const hero = container.querySelector(".mx-auto section > div") as HTMLDivElement | null;
    const selectedSource = screen.getByRole("button", {
      name: /pro monthly/i,
    });
    const inactiveSource = screen.getByRole("button", {
      name: /studio credits 12k/i,
    });

    expect(halo?.style.backgroundImage).toBe(createSdkworkCheckoutBackdropStyle().backgroundImage);
    expect(hero?.style.backgroundImage).toBe(createSdkworkCheckoutHeroStyle().backgroundImage);
    expect(selectedSource.style.backgroundImage).toBe(
      createSdkworkCheckoutPanelStyle("brand", {
        backgroundWeight: 14,
        borderWeight: 34,
        surfaceColor: "var(--sdk-color-surface-panel-muted)",
      }).backgroundImage,
    );
    expect(inactiveSource.style.backgroundImage).toBe(
      createSdkworkCheckoutPanelStyle("neutral", {
        backgroundWeight: 8,
        borderWeight: 24,
        surfaceColor: "var(--sdk-color-surface-panel-muted)",
      }).backgroundImage,
    );
  });
});
