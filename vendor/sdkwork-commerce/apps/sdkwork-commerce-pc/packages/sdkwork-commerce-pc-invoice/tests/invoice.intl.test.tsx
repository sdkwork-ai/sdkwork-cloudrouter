import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkInvoiceIntlProvider,
  SdkworkInvoicePage,
  SdkworkInvoiceStatGrid,
  createSdkworkInvoiceController,
} from "../src";

function createInvoiceDashboard() {
  return {
    digest: {
      actionableInvoices: 1,
      archivedInvoices: 1,
      completedInvoices: 1,
      processingInvoices: 1,
      totalAmountCny: 998,
      totalInvoices: 3,
    },
    invoices: [
      {
        canCancel: false,
        canDownload: false,
        canEdit: true,
        canSubmit: true,
        createdAt: "2026-04-03T09:00:00.000Z",
        currency: "CNY",
        id: "INV-3",
        status: "draft" as const,
        statusLabel: "Draft",
        title: "SDKWORK Technology",
        titleType: "company" as const,
        totalAmountCny: 199,
        type: "special" as const,
      },
    ],
    statistics: {
      completedInvoices: 2,
      pendingInvoices: 1,
      totalAmountCny: 998,
      totalInvoices: 3,
    },
  };
}

describe("sdkwork-commerce-pc-invoice intl", () => {
  it("renders Chinese copy across the invoice page when a Chinese locale is provided", async () => {
    const controller = createSdkworkInvoiceController({
      service: {
        cancelInvoice: vi.fn(),
        createInvoice: vi.fn(),
        getDashboard: vi.fn().mockResolvedValue(createInvoiceDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            actionableInvoices: 0,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
          invoices: [],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
        }),
        getInvoiceDetail: vi.fn().mockResolvedValue({
          amountExcludingTaxCny: 176,
          createdAt: "2026-04-03T09:00:00.000Z",
          currency: "CNY",
          id: "INV-3",
          items: [
            {
              amountExcludingTaxCny: 176,
              id: "ITEM-3",
              name: "Pro Monthly",
              quantity: 1,
              taxAmountCny: 23,
              taxRate: 13,
              totalAmountCny: 199,
              unit: "license",
              unitPriceExcludingTaxCny: 176,
            },
          ],
          status: "draft" as const,
          statusLabel: "Draft",
          taxAmountCny: 23,
          taxRate: 13,
          title: "SDKWORK Technology",
          titleType: "company" as const,
          totalAmountCny: 199,
          type: "special" as const,
        }),
        submitInvoice: vi.fn(),
        updateInvoice: vi.fn(),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkInvoicePage controller={controller} locale="zh-CN" />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "\u53d1\u7968\u4e2d\u5fc3",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "\u5f00\u7968\u5386\u53f2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "\u5168\u90e8" })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "\u67e5\u770b\u8be6\u60c5",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "\u53d1\u7968\u8be6\u60c5",
      }),
    ).toBeInTheDocument();
  });

  it("applies host message overrides on top of the localized invoice copy seam", async () => {
    const controller = createSdkworkInvoiceController({
      service: {
        cancelInvoice: vi.fn(),
        createInvoice: vi.fn(),
        getDashboard: vi.fn().mockResolvedValue(createInvoiceDashboard()),
        getEmptyDashboard: vi.fn().mockReturnValue({
          digest: {
            actionableInvoices: 0,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
          invoices: [],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 0,
            totalAmountCny: 0,
            totalInvoices: 0,
          },
        }),
        getInvoiceDetail: vi.fn(),
        submitInvoice: vi.fn(),
        updateInvoice: vi.fn(),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkInvoicePage
          controller={controller}
          locale="zh-CN"
          messages={{
            actions: {
              newInvoice: "Open drafting studio",
            },
            page: {
              title: "Host invoice cockpit",
            },
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Host invoice cockpit",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open drafting studio" })).toBeInTheDocument();
  });

  it("falls back to built-in English copy for standalone components without a host intl provider", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkInvoiceStatGrid
          digest={{
            actionableInvoices: 2,
            archivedInvoices: 1,
            completedInvoices: 1,
            processingInvoices: 1,
            totalAmountCny: 998,
            totalInvoices: 3,
          }}
          statistics={{
            completedInvoices: 2,
            pendingInvoices: 1,
            totalAmountCny: 998,
            totalInvoices: 3,
          }}
        />
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("Completed amount")).toBeInTheDocument();
    expect(screen.getByText("Processing queue")).toBeInTheDocument();
  });

  it("lets standalone invoice components consume Chinese copy through the intl provider", () => {
    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkInvoiceIntlProvider locale="zh-CN">
          <SdkworkInvoiceStatGrid
            digest={{
              actionableInvoices: 2,
              archivedInvoices: 1,
              completedInvoices: 1,
              processingInvoices: 1,
              totalAmountCny: 998,
              totalInvoices: 3,
            }}
            statistics={{
              completedInvoices: 2,
              pendingInvoices: 1,
              totalAmountCny: 998,
              totalInvoices: 3,
            }}
          />
        </SdkworkInvoiceIntlProvider>
      </SdkworkThemeProvider>,
    );

    expect(screen.getByText("\u5df2\u5f00\u7968\u91d1\u989d")).toBeInTheDocument();
    expect(screen.getByText("\u5904\u7406\u4e2d\u961f\u5217")).toBeInTheDocument();
  });
});
