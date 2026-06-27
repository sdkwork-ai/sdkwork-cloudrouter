import { describe, expect, it, vi } from "vitest";
import * as billingModule from "../src";

describe("sdkwork-commerce-pc-billing controller", () => {
  it("bootstraps, switches tabs and breakdowns, filters visible usage, and preserves the selected breakdown after refresh", async () => {
    const { createSdkworkBillingController } = billingModule;

    const firstDashboard = {
      alerts: [],
      breakdowns: {
        capability: [
          {
            changeRate: 0,
            costCny: 85,
            id: "chat",
            kind: "capability",
            label: "Chat",
            share: 85,
            units: 360000,
          },
          {
            changeRate: 0,
            costCny: 15,
            id: "rtc",
            kind: "capability",
            label: "RTC",
            share: 15,
            units: 80,
          },
        ],
        model: [
          {
            changeRate: 0,
            costCny: 60,
            id: "GPT-5.4",
            kind: "model",
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
            kind: "provider",
            label: "OpenAI",
            share: 60,
            units: 240000,
          },
          {
            changeRate: 0,
            costCny: 25,
            id: "anthropic",
            kind: "provider",
            label: "Anthropic",
            share: 25,
            units: 120000,
          },
        ],
        workspace: [
          {
            changeRate: 0,
            costCny: 85,
            id: "studio",
            kind: "workspace",
            label: "Studio",
            share: 85,
            units: 360000,
          },
        ],
      },
      budgetPolicy: {
        budgetAmountCny: 120,
        currency: "CNY",
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
        recentInvoices: [],
      },
      paymentAttention: {
        actionablePayments: 2,
        availablePaymentMethods: 1,
        outstandingAmountCny: 90,
        recentPayments: [],
      },
      posture: "payment-attention",
      recentUsage: [
        {
          capability: "chat",
          costCny: 25,
          id: "usage-2",
          model: "Claude Sonnet 4.5",
          provider: "anthropic",
          title: "Claude Sonnet 4.5",
          unitLabel: "tokens",
          units: 120000,
          usageAt: "2026-04-15T07:00:00.000Z",
          workspace: "studio",
        },
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
        reason: "payment-attention",
        route: "/payments?filter=actionable",
        target: "payment",
      },
    };
    const secondDashboard = {
      ...firstDashboard,
      breakdowns: {
        ...firstDashboard.breakdowns,
        model: [
          {
            changeRate: 5,
            costCny: 72,
            id: "GPT-5.4",
            kind: "model",
            label: "GPT-5.4",
            share: 72,
            units: 280000,
          },
        ],
      },
      recentUsage: [
        {
          capability: "chat",
          costCny: 72,
          id: "usage-4",
          model: "GPT-5.4",
          provider: "openai",
          title: "GPT-5.4",
          unitLabel: "tokens",
          units: 280000,
          usageAt: "2026-04-15T09:30:00.000Z",
          workspace: "studio",
        },
      ],
    };
    const service = {
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(firstDashboard)
        .mockResolvedValueOnce(secondDashboard),
      getEmptyDashboard: vi.fn().mockReturnValue({
        alerts: [],
        breakdowns: {
          capability: [],
          model: [],
          provider: [],
          workspace: [],
        },
        budgetPolicy: {
          budgetAmountCny: 200,
          currency: "CNY",
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
        posture: "healthy",
        recentUsage: [],
        summary: {
          activeSubscriptionPlans: 0,
          availablePoints: 0,
          bestOfferSavingsCny: 0,
          currentLevelName: "Guest",
          totalSpentCny: null,
        },
        topAction: null,
      }),
    };

    const controller = createSdkworkBillingController({
      service,
    });

    await controller.bootstrap();
    expect(controller.getState()).toMatchObject({
      activeBreakdown: "provider",
      activeTab: "overview",
      isBootstrapped: true,
      isLoading: false,
      selectedBreakdownId: "openai",
    });
    expect(controller.getState().visibleUsage.map((record: { id: string }) => record.id)).toEqual([
      "usage-1",
    ]);

    controller.setTab("invoices");
    expect(controller.getState().activeTab).toBe("invoices");

    controller.setBreakdown("model");
    controller.selectBreakdown("GPT-5.4");
    expect(controller.getState().visibleUsage.map((record: { id: string }) => record.id)).toEqual([
      "usage-1",
    ]);

    await controller.refresh();
    expect(controller.getState().selectedBreakdownId).toBe("GPT-5.4");
    expect(controller.getState().visibleUsage.map((record: { id: string }) => record.id)).toEqual([
      "usage-4",
    ]);
  });

  it("uses localized controller fallback messages for zh-CN", async () => {
    const { createSdkworkBillingController } = billingModule;

    const controller = createSdkworkBillingController({
      locale: "zh-CN",
      service: {
        getDashboard: vi.fn().mockRejectedValue("network-timeout"),
        getEmptyDashboard: vi.fn().mockReturnValue({
          alerts: [],
          breakdowns: {
            capability: [],
            model: [],
            provider: [],
            workspace: [],
          },
          budgetPolicy: {
            budgetAmountCny: 200,
            currency: "CNY",
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
          posture: "healthy",
          recentUsage: [],
          summary: {
            activeSubscriptionPlans: 0,
            availablePoints: 0,
            bestOfferSavingsCny: 0,
            currentLevelName: "Guest",
            totalSpentCny: null,
          },
          topAction: null,
        }),
      },
    });

    await expect(controller.bootstrap()).rejects.toBe("network-timeout");
    expect(controller.getState().lastError).toBe("\u52a0\u8f7d\u8d26\u5355\u4e2d\u5fc3\u5931\u8d25\u3002");
  });
});
