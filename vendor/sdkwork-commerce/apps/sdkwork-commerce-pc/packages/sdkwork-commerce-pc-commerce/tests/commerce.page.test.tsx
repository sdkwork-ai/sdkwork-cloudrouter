import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkCommercePage } from "../src";

describe("sdkwork-commerce-pc-commerce page", () => {
  it("renders the commercial hub with cross-package wallet, membership, and order signals", async () => {
    const service = {
      getEmptySnapshot: vi.fn().mockReturnValue({
        alerts: [],
        analyticsSummary: {
          activeAlerts: 0,
          averageOrderValueCny: 0,
          totalRevenueCny: 0,
          totalRevenueRecords: 0,
          totalSuccessfulOrders: 0,
        },
        featuredOffers: [],
        offerDigest: {
          couponOffers: 0,
          featuredOffers: 0,
          highlightedSavingsCny: 0,
          membershipOffers: 0,
          rechargeOffers: 0,
        },
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
          currentLevelName: "Guest",
          expiringSoonCoupons: 0,
          featuredOffers: 0,
          invoiceActionRequired: 0,
          invoicePendingCount: 0,
          isAuthenticated: false,
          pendingPaymentOrders: 0,
          totalOrders: 0,
        },
      }),
      getSnapshot: vi.fn().mockResolvedValue({
        alerts: [
          {
            description: "One payment is still waiting for completion.",
            id: "payments-pending",
            metric: "1 pending",
            severity: "warning",
            title: "Pending payment follow-up",
          },
          {
            description: "One invoice needs manual issuance attention.",
            id: "invoices-action-required",
            metric: "1 invoice",
            severity: "danger",
            title: "Invoice action required",
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
            direction: "spent",
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
          currentLevelName: "Pro",
          expiringSoonCoupons: 0,
          featuredOffers: 1,
          invoiceActionRequired: 1,
          invoicePendingCount: 1,
          isAuthenticated: true,
          pendingPaymentOrders: 1,
          totalOrders: 9,
        },
      }),
    };

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkCommercePage service={service} />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /commerce hub/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getAllByText("Pro Annual").length).toBeGreaterThan(0);
    expect(screen.getByText("Pro Monthly 80")).toBeInTheDocument();
    expect(screen.getByText("Points usage")).toBeInTheDocument();
    expect(screen.getAllByText("WECHAT_PAY").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("SDKWORK Technology")).toBeInTheDocument();
    expect(screen.getByText(/available coupons/i)).toBeInTheDocument();
    expect(screen.getByText(/payment methods/i)).toBeInTheDocument();
    expect(screen.getByText(/revenue command/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /revenue trend/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /analytics workbench/i })).toBeInTheDocument();
    expect(screen.getByText(/pending payment follow-up/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /featured offers/i,
      }),
    ).toBeInTheDocument();
  });
});
