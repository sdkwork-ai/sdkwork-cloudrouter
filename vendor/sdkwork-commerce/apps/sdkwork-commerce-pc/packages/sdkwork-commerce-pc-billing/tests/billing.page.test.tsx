import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { SdkworkBillingPage } from "../src";

describe("sdkwork-commerce-pc-billing page", () => {
  it("renders the billing center, switches tabs, and routes the recommended action through onNavigate", async () => {
    const onNavigate = vi.fn();

    const service = {
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
      getDashboard: vi.fn().mockResolvedValue({
        alerts: [
          {
            action: {
              label: "Resolve payment attention",
              route: "/payments?filter=actionable",
              target: "payment",
            },
            description: "Two payment attempts are still waiting for settlement.",
            id: "payment-attention",
            severity: "critical",
            title: "Payment attention required",
            value: "CN婵?0",
          },
        ],
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
      }),
    };

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkBillingPage onNavigate={onNavigate} service={service} />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /billing center/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /invoices/i,
      }),
    );
    expect(screen.getByText("SDKWORK Technology")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /resolve payment attention/i,
      }),
    );

    expect(onNavigate).toHaveBeenCalledWith("/payments?filter=actionable");
  });

  it("keeps the billing hero free of raw white utility surfaces", () => {
    const pageSource = readFileSync(
      resolve(import.meta.dirname, "../src/pages/BillingPage.tsx"),
      "utf8",
    );

    expect(pageSource).not.toContain("border-white/10");
    expect(pageSource).not.toContain("bg-white/10");
    expect(pageSource).not.toContain("bg-white/8");
    expect(pageSource).not.toContain("text-white/72");
    expect(pageSource).not.toContain("text-white/68");
    expect(pageSource).not.toContain("text-white/65");
  });
});
