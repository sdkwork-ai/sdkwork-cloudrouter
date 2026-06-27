import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkCommerceActivityGrid,
} from "../src";

describe("sdkwork-commerce-pc-commerce activity grid", () => {
  it("renders recent coupons, transactions, orders, invoices, and payments", () => {
    const ActivityGrid = SdkworkCommerceActivityGrid;

    expect(ActivityGrid).toBeTypeOf("function");

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <ActivityGrid
          snapshot={{
            recentCoupons: [
              {
                amountCny: 80,
                available: true,
                code: "PRO80",
                couponId: "200",
                id: "user-coupon-UC-200",
                minimumSpendCny: 199,
                name: "Pro Monthly 80",
                pointCost: null,
                pointsRefunded: false,
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
                discountAmountCny: 0,
                id: "ORDER-3",
                paidAmountCny: 0,
                quantity: 1,
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
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText(/recent discount inventory/i)).toBeInTheDocument();
    expect(screen.getByText(/recent point activity/i)).toBeInTheDocument();
    expect(screen.getByText(/recent billing orders/i)).toBeInTheDocument();
    expect(screen.getByText(/recent invoice pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/recent payment attempts/i)).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly 80")).toBeInTheDocument();
    expect(screen.getByText("Points usage")).toBeInTheDocument();
    expect(screen.getByText("Pro Monthly")).toBeInTheDocument();
    expect(screen.getByText("SDKWORK Technology")).toBeInTheDocument();
    expect(screen.getAllByText("WECHAT_PAY")).toHaveLength(2);
  });
});
