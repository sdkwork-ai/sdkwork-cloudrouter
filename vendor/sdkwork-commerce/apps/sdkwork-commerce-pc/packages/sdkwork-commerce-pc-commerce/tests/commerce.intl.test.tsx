import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceHeroPanel,
  SdkworkCommerceIntlProvider,
  SdkworkCommercePage,
} from "../src";

function createSnapshot() {
  return {
    alerts: [
      {
        description: "One payment is still waiting for completion.",
        id: "payments-pending",
        metric: "1 pending",
        severity: "warning" as const,
        title: "Pending payment follow-up",
      },
    ],
    analyticsSummary: {
      activeAlerts: 2,
      averageOrderValueCny: 333.22,
      totalRevenueCny: 2999,
      totalRevenueRecords: 9,
      totalSuccessfulOrders: 8,
    },
    featuredOffers: [
      {
        action: {
          capability: "subscription",
          label: "Open renewal",
          route: "/subscription?mode=renew&packageId=3",
        },
        description: "Annual membership package",
        estimatedSavingsCny: 300,
        group: "membership",
        id: "offer-membership-3",
        kind: "membership-renewal",
        priceCny: 699,
        recommended: true,
        tags: ["Annual"],
        title: "Pro Annual",
      },
    ],
    offerDigest: {
      couponOffers: 1,
      featuredOffers: 1,
      highlightedSavingsCny: 300,
      membershipOffers: 1,
      rechargeOffers: 0,
    },
    productPerformance: [
      {
        id: "product-pro-monthly",
        orderCount: 4,
        sharePercent: 62,
        title: "Pro Monthly",
        totalRevenueCny: 1999,
        trendDeltaPercent: 14.5,
      },
    ],
    recentCoupons: [
      {
        amountCny: 80,
        code: "PRO80",
        couponId: "200",
        id: "user-coupon-UC-200",
        name: "Pro Monthly 80",
        remainingDays: 15,
        status: "available",
        type: "cash",
        userCouponId: "UC-200",
      },
    ],
    recentInvoices: [
      {
        canCancel: false,
        canDownload: true,
        canEdit: false,
        canSubmit: false,
        createdAt: "2026-04-03T08:00:00.000Z",
        currency: "CNY",
        id: "INV-1002",
        invoiceCode: "3100231130",
        invoiceNo: "00012291",
        status: "completed",
        statusLabel: "Completed",
        title: "SDKWORK Technology",
        titleType: "company",
        totalAmountCny: 399,
        type: "electronic",
        updatedAt: "2026-04-03T10:30:00.000Z",
      },
    ],
    recentOrders: [
      {
        createdAt: "2026-04-03T09:00:00.000Z",
        id: "ORDER-3",
        paidAmountCny: 0,
        status: "pending-payment",
        statusLabel: "Pending payment",
        subject: "Pro Monthly",
        totalAmountCny: 199,
      },
    ],
    recentPayments: [
      {
        amountCny: 199,
        canClose: true,
        canReconcile: true,
        canRefreshStatus: true,
        createdAt: "2026-04-03T09:05:00.000Z",
        id: "PAY-2",
        orderId: "ORDER-3",
        outTradeNo: "OUT-ORDER-3",
        paymentMethod: "WECHAT_PAY",
        paymentProvider: "WECHAT_PAY",
        paymentSn: "PAYMENT-0002",
        status: "pending",
        statusLabel: "Pending",
      },
    ],
    recentRevenueRecords: [
      {
        amountCny: 699,
        channel: "WECHAT_PAY",
        id: "ORDER-300",
        orderNo: "ORDER-300",
        productTitle: "Pro Annual",
        status: "success",
        timestamp: "2026-04-03T09:05:00.000Z",
      },
    ],
    recentTransactions: [
      {
        createdAt: "2026-04-02T11:00:00.000Z",
        direction: "spent" as const,
        id: "transaction-2",
        points: 240,
        status: "completed",
        title: "Points usage",
      },
    ],
    revenueTrend: [
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
    ],
    summary: {
      actionablePayments: 1,
      availableCoupons: 1,
      availablePoints: 2400,
      availablePaymentMethods: 2,
      bestOfferSavingsCny: 300,
      claimableCoupons: 1,
      claimedBenefits: 6,
      currentLevelName: "Pro",
      expiringSoonCoupons: 0,
      featuredOffers: 1,
      invoiceActionRequired: 1,
      invoicePendingCount: 1,
      isAuthenticated: true,
      pendingPaymentOrders: 1,
      totalOrders: 9,
      totalSpentCny: 699,
      membershipRemainingDays: 38,
    },
  };
}

function createEmptySnapshot() {
  return {
    ...createSnapshot(),
    alerts: [],
    featuredOffers: [],
    productPerformance: [],
    recentCoupons: [],
    recentInvoices: [],
    recentOrders: [],
    recentPayments: [],
    recentRevenueRecords: [],
    recentTransactions: [],
    revenueTrend: [],
    summary: {
      actionablePayments: 0,
      availableCoupons: 0,
      availablePoints: 0,
      availablePaymentMethods: 0,
      bestOfferSavingsCny: 0,
      claimableCoupons: 0,
      claimedBenefits: 0,
      currentLevelName: "Guest",
      expiringSoonCoupons: 0,
      featuredOffers: 0,
      invoiceActionRequired: 0,
      invoicePendingCount: 0,
      isAuthenticated: false,
      pendingPaymentOrders: 0,
      totalOrders: 0,
      totalSpentCny: 0,
      membershipRemainingDays: null,
    },
  };
}

function createService() {
  return {
    getEmptySnapshot: vi.fn().mockReturnValue(createEmptySnapshot()),
    getSnapshot: vi.fn().mockResolvedValue(createSnapshot()),
  };
}

describe("sdkwork-commerce-pc-commerce intl", () => {
  it("renders Chinese copy across the commerce page when a Chinese locale is provided", async () => {
    const CommercePage = SdkworkCommercePage;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <CommercePage service={createService()} locale="zh-CN" />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "商业中枢",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("商业系统")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "精选方案" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "分析工作台" })).toBeInTheDocument();
  });

  it("applies host message overrides on top of the localized commerce seam", async () => {
    const CommercePage = SdkworkCommercePage;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <CommercePage
          locale="zh-CN"
          messages={{
            hero: {
              title: "Host commerce cockpit",
            },
            featuredOffers: {
              title: "Host featured lane",
            },
          }}
          service={createService()}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Host commerce cockpit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Host featured lane" })).toBeInTheDocument();
  });

  it("falls back to built-in English copy for standalone commerce components without a host intl provider", () => {
    const HeroPanel = SdkworkCommerceHeroPanel;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <HeroPanel summary={createSnapshot().summary} />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Commercial System")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /commerce hub/i })).toBeInTheDocument();
    expect(screen.getByText(/available points/i)).toBeInTheDocument();
  });

  it("lets standalone commerce components consume Chinese copy through the intl provider", () => {
    const CommerceIntlProvider = SdkworkCommerceIntlProvider;
    const HeroPanel = SdkworkCommerceHeroPanel;

    expect(CommerceIntlProvider).toBeTypeOf("function");

    if (typeof CommerceIntlProvider !== "function") {
      return;
    }

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <CommerceIntlProvider locale="zh-CN">
          <HeroPanel summary={createSnapshot().summary} />
        </CommerceIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("商业系统")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "商业中枢" })).toBeInTheDocument();
    expect(screen.getByText("可用积分")).toBeInTheDocument();
  });
});
