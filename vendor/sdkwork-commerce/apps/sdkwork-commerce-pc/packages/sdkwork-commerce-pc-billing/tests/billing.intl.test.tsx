import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkBillingIntlProvider,
  SdkworkBillingPage,
  SdkworkBillingSummaryCards,
  createSdkworkBillingController,
} from "../src";

function createDashboard() {
  return {
    alerts: [
      {
        action: {
          label: "Resolve payment attention",
          route: "/payments?filter=actionable",
          target: "payment",
        },
        description: "Two payment attempts are still waiting for settlement.",
        id: "payment-attention",
        severity: "critical" as const,
        title: "Payment attention required",
        value: "CNY 90",
      },
    ],
    breakdowns: {
      capability: [
        {
          changeRate: 0,
          costCny: 85,
          id: "chat",
          kind: "capability" as const,
          label: "Chat",
          share: 85,
          units: 360000,
        },
      ],
      model: [
        {
          changeRate: 0,
          costCny: 60,
          id: "GPT-5.4",
          kind: "model" as const,
          label: "GPT-5.4",
          share: 60,
          units: 240000,
        },
      ],
      provider: [
        {
          changeRate: 0,
          costCny: 60,
          id: "openai",
          kind: "provider" as const,
          label: "OpenAI",
          share: 60,
          units: 240000,
        },
      ],
      workspace: [
        {
          changeRate: 0,
          costCny: 85,
          id: "studio",
          kind: "workspace" as const,
          label: "Studio",
          share: 85,
          units: 360000,
        },
      ],
    },
    budgetPolicy: {
      budgetAmountCny: 120,
      currency: "CNY" as const,
      projectionDays: 30,
      warningThreshold: 0.75,
    },
    digest: {
      budgetAmountCny: 120,
      budgetRemainingCny: 20,
      monthSpendCny: 100,
      outstandingAmountCny: 90,
      projectedMonthSpendCny: 200,
      savingsOpportunityCny: 300,
      todaySpendCny: 40,
    },
    invoiceAttention: {
      actionableInvoices: 1,
      pendingInvoices: 1,
      recentInvoices: [
        {
          canCancel: false,
          canDownload: false,
          canEdit: false,
          canSubmit: true,
          createdAt: "2026-04-15T06:30:00.000Z",
          currency: "CNY",
          id: "INV-9001",
          status: "draft",
          statusLabel: "Draft",
          title: "SDKWORK Technology",
          titleType: "company",
          totalAmountCny: 199,
          type: "electronic",
          updatedAt: "2026-04-15T06:30:00.000Z",
        },
      ],
    },
    paymentAttention: {
      actionablePayments: 2,
      availablePaymentMethods: 1,
      outstandingAmountCny: 90,
      recentPayments: [
        {
          amountCny: 60,
          canClose: true,
          canReconcile: true,
          canRefreshStatus: true,
          createdAt: "2026-04-15T08:30:00.000Z",
          id: "PAY-9001",
          orderId: "ORDER-9001",
          paymentMethod: "WECHAT_PAY",
          paymentProvider: "WECHAT_PAY",
          paymentSn: "PAYMENT-9001",
          status: "pending",
          statusLabel: "Pending",
        },
      ],
    },
    posture: "payment-attention" as const,
    recentUsage: [
      {
        capability: "chat",
        costCny: 60,
        id: "usage-1",
        model: "GPT-5.4",
        provider: "openai",
        title: "GPT-5.4",
        unitLabel: "tokens",
        units: 240000,
        usageAt: "2026-04-10T09:00:00.000Z",
        workspace: "studio",
      },
    ],
    summary: {
      activeSubscriptionPlans: 1,
      availablePoints: 2400,
      bestOfferSavingsCny: 300,
      currentLevelName: "Pro",
      totalSpentCny: 399,
    },
    topAction: {
      label: "Resolve payment attention",
      reason: "payment-attention" as const,
      route: "/payments?filter=actionable",
      target: "payment",
    },
  };
}

function createEmptyDashboard() {
  return {
    alerts: [],
    breakdowns: {
      capability: [],
      model: [],
      provider: [],
      workspace: [],
    },
    budgetPolicy: {
      budgetAmountCny: 200,
      currency: "CNY" as const,
      projectionDays: 30,
      warningThreshold: 0.8,
    },
    digest: {
      budgetAmountCny: 200,
      budgetRemainingCny: 200,
      monthSpendCny: 0,
      outstandingAmountCny: 0,
      projectedMonthSpendCny: 0,
      savingsOpportunityCny: 0,
      todaySpendCny: 0,
    },
    invoiceAttention: {
      actionableInvoices: 0,
      pendingInvoices: 0,
      recentInvoices: [],
    },
    paymentAttention: {
      actionablePayments: 0,
      availablePaymentMethods: 0,
      outstandingAmountCny: 0,
      recentPayments: [],
    },
    posture: "healthy" as const,
    recentUsage: [],
    summary: {
      activeSubscriptionPlans: 0,
      availablePoints: 0,
      bestOfferSavingsCny: 0,
      currentLevelName: "Guest",
      totalSpentCny: null,
    },
    topAction: null,
  };
}

function createController() {
  return createSdkworkBillingController({
    service: {
      getDashboard: vi.fn().mockResolvedValue(createDashboard()),
      getEmptyDashboard: vi.fn().mockReturnValue(createEmptyDashboard()),
    },
  });
}

describe("sdkwork-commerce-pc-billing intl", () => {
  it("renders Chinese copy across the billing page when a Chinese locale is provided", async () => {
    const BillingPage = SdkworkBillingPage;
    const controller = createController();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <BillingPage controller={controller} locale="zh-CN" />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "\u8d26\u5355\u4e2d\u5fc3",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u5237\u65b0\u8d26\u5355" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u53d1\u7968" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "\u8d39\u7528\u5206\u5e03" })).toBeInTheDocument();
  });

  it("applies host message overrides on top of the localized billing seam", async () => {
    const BillingPage = SdkworkBillingPage;
    const controller = createController();

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <BillingPage
          controller={controller}
          locale="zh-CN"
          messages={{
            page: {
              title: "Host billing cockpit",
            },
            actions: {
              refresh: "Sync now",
            },
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Host billing cockpit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync now" })).toBeInTheDocument();
  });

  it("falls back to built-in English copy for standalone billing components without a host intl provider", () => {
    const BillingSummaryCards = SdkworkBillingSummaryCards;

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <BillingSummaryCards
          digest={createDashboard().digest}
          posture="over-budget"
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Today spend")).toBeInTheDocument();
    expect(screen.getByText("Over budget")).toBeInTheDocument();
  });

  it("lets standalone billing components consume Chinese copy through the intl provider", () => {
    const BillingIntlProvider = SdkworkBillingIntlProvider;
    const BillingSummaryCards = SdkworkBillingSummaryCards;

    expect(BillingIntlProvider).toBeTypeOf("function");

    if (typeof BillingIntlProvider !== "function") {
      return;
    }

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <BillingIntlProvider locale="zh-CN">
          <BillingSummaryCards
            digest={createDashboard().digest}
            posture="payment-attention"
          />
        </BillingIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("\u4eca\u65e5\u652f\u51fa")).toBeInTheDocument();
    expect(screen.getByText("\u652f\u4ed8\u5f85\u5904\u7406")).toBeInTheDocument();
  });
});
