import { describe, expect, it } from "vitest";
import * as billingModule from "../src";

describe("sdkwork-commerce-pc-billing headless contract", () => {
  it("creates reusable manifests, route intents, budget policy, usage summaries, and posture evaluation", () => {
    const {
      billingPackageMeta,
      createBillingRouteIntent,
      createBillingWorkspaceManifest,
      createSdkworkBillingBudgetPolicy,
      evaluateSdkworkBillingPosture,
      summarizeSdkworkBillingUsage,
    } = billingModule;

    expect(billingPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-billing",
    });

    expect(
      createBillingWorkspaceManifest({
        title: "Billing",
      }),
    ).toMatchObject({
      capability: "billing",
      packageNames: [
        "@sdkwork/commerce-pc-billing",
        "@sdkwork/commerce-pc-payment",
        "@sdkwork/commerce-pc-invoice",
        "@sdkwork/commerce-pc-order",
        "@sdkwork/commerce-pc-subscription",
        "@sdkwork/commerce-pc-offer",
        "@sdkwork/commerce-pc-points",
        "@sdkwork/commerce-pc-wallet",
      ],
      routePath: "/billing",
      title: "Billing",
    });
    expect(
      createBillingWorkspaceManifest({
        locale: "zh-CN",
      }),
    ).toMatchObject({
      description: "\u7528\u4e8e\u7ba1\u7406\u652f\u51fa\u72b6\u6001\u3001\u8ba1\u91cf\u7528\u91cf\u3001\u9884\u7b97\u9884\u8b66\u4e0e\u8d26\u5355\u4e2d\u5fc3\u8def\u7531\u7684\u5de5\u4f5c\u533a\u3002",
      title: "\u8d26\u5355",
    });

    expect(
      createBillingRouteIntent({
        breakdown: "model",
        tab: "invoices",
      }),
    ).toEqual({
      breakdown: "model",
      focusWindow: true,
      route: "/billing?tab=invoices&breakdown=model",
      source: "billing-workspace",
      tab: "invoices",
      type: "billing-route-intent",
    });

    const budgetPolicy = createSdkworkBillingBudgetPolicy({
      budgetAmountCny: 120,
      warningThreshold: 0.75,
    });

    expect(budgetPolicy).toEqual({
      budgetAmountCny: 120,
      currency: "CNY",
      projectionDays: 30,
      warningThreshold: 0.75,
    });

    const summary = summarizeSdkworkBillingUsage(
      [
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
          capability: "rtc",
          costCny: 15,
          id: "usage-3",
          model: "Realtime Minutes",
          provider: "rtc-cloud",
          title: "Realtime Minutes",
          unitLabel: "minutes",
          units: 80,
          usageAt: "2026-04-15T08:00:00.000Z",
          workspace: "meetings",
        },
      ],
      {
        budgetPolicy,
        referenceDate: "2026-04-15T12:00:00.000Z",
      },
    );

    expect(summary.digest).toEqual({
      budgetAmountCny: 120,
      budgetRemainingCny: 20,
      monthSpendCny: 100,
      outstandingAmountCny: 0,
      projectedMonthSpendCny: 200,
      savingsOpportunityCny: 0,
      todaySpendCny: 40,
    });
    expect(summary.breakdowns.provider[0]).toMatchObject({
      costCny: 60,
      id: "openai",
      label: "OpenAI",
      share: 60,
      units: 240000,
    });
    expect(summary.breakdowns.capability[0]).toMatchObject({
      costCny: 85,
      id: "chat",
      label: "Chat",
    });
    expect(summary.recentUsage.map((record: { id: string }) => record.id)).toEqual([
      "usage-3",
      "usage-2",
      "usage-1",
    ]);

    const posture = evaluateSdkworkBillingPosture({
      actionablePayments: 2,
      digest: {
        ...summary.digest,
        outstandingAmountCny: 30,
      },
      invoiceActionRequired: 1,
      locale: "zh-CN",
    });

    expect(posture).toMatchObject({
      status: "payment-attention",
      topAction: {
        capability: "payment",
        intent: "resolve",
        reason: "payment-attention",
        route: "/payments?filter=actionable",
        label: "\u5904\u7406\u5f85\u652f\u4ed8\u9879",
      },
    });
    expect(posture.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "payment-attention",
          severity: "critical",
          title: "\u652f\u4ed8\u5f85\u5904\u7406",
        }),
        expect.objectContaining({
          id: "projected-budget-overrun",
          severity: "warning",
          title: "\u9884\u4f30\u652f\u51fa\u8d85\u51fa\u9884\u7b97",
        }),
      ]),
    );
  });
});
