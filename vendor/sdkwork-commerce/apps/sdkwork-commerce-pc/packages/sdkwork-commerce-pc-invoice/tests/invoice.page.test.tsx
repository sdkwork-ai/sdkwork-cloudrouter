import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import {
  SdkworkInvoicePage,
  createSdkworkInvoiceController,
} from "../src";

describe("sdkwork-commerce-pc-invoice page", () => {
  it("renders the reusable invoice center with create dialog and detail drawer flows", async () => {
    const controller = createSdkworkInvoiceController({
      service: {
        cancelInvoice: vi.fn(),
        createInvoice: vi.fn().mockResolvedValue({
          id: "INV-1003",
          status: "draft" as const,
        }),
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 1,
            archivedInvoices: 1,
            completedInvoices: 1,
            processingInvoices: 0,
            totalAmountCny: 498,
            totalInvoices: 2,
          },
          invoices: [
            {
              canCancel: false,
              canEdit: true,
              canSubmit: true,
              createdAt: "2026-04-02T08:00:00.000Z",
              currency: "CNY",
              id: "INV-1001",
              status: "draft" as const,
              statusLabel: "Draft",
              title: "SDKWORK Technology",
              titleType: "company" as const,
              totalAmountCny: 199,
              type: "special" as const,
              updatedAt: "2026-04-02T08:30:00.000Z",
            },
          ],
          statistics: {
            completedInvoices: 1,
            pendingInvoices: 0,
            totalAmountCny: 299,
            totalInvoices: 2,
          },
        }),
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
          createdAt: "2026-04-02T08:00:00.000Z",
          currency: "CNY",
          id: "INV-1001",
          items: [
            {
              id: "ITEM-1001-1",
              name: "Pro Monthly",
              quantity: 1,
              totalAmountCny: 199,
              unit: "license",
            },
          ],
          status: "draft" as const,
          statusLabel: "Draft",
          title: "SDKWORK Technology",
          totalAmountCny: 199,
          type: "special" as const,
        }),
        submitInvoice: vi.fn(),
        updateInvoice: vi.fn(),
      },
    });

    render(
      <SdkworkThemeProvider defaultTheme="light">
        <SdkworkInvoicePage controller={controller} />
      </SdkworkThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /invoice center/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("SDKWORK Technology")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /new invoice/i,
      }),
    );
    const editorDialog = await screen.findByRole("dialog", {
      name: /create invoice/i,
    });
    expect(editorDialog).toBeInTheDocument();
    fireEvent.click(
      within(editorDialog).getAllByRole("button", {
        name: /^close$/i,
      })[0],
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /view details/i,
      }),
    );
    expect(
      await screen.findByRole("heading", {
        name: /invoice detail/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps the invoice hero free of raw white utility surfaces", () => {
    const pageSource = readFileSync(
      resolve(import.meta.dirname, "../src/pages/InvoicePage.tsx"),
      "utf8",
    );

    expect(pageSource).not.toContain("border-white/10");
    expect(pageSource).not.toContain("bg-white/10");
    expect(pageSource).not.toContain("text-white/72");
    expect(pageSource).not.toContain("text-white/68");
  });
});
