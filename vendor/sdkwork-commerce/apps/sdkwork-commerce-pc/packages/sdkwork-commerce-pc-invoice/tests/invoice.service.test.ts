import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureCommerceServiceMockSession,
  createCommerceServiceMock,
  resetCommerceServiceMockSession,
} from "../../../tests/test-utils/commerce-service-mock";
import { createSdkworkInvoiceService } from "../src";

describe("sdkwork-commerce-pc-invoice service", () => {
  beforeEach(() => {
    configureCommerceServiceMockSession({ authToken: "invoice-auth-token" });
  });

  afterEach(() => {
    resetCommerceServiceMockSession();
  });

  it("maps invoice dashboard data, backend statistics, and status digests into a reusable invoice center snapshot", async () => {
    const commerceService = createCommerceServiceMock({
      invoices: {
        statistics: {
          retrieve: vi.fn().mockResolvedValue({
            code: "2000",
            data: {
              completedInvoices: 1,
              pendingInvoices: 1,
              totalAmount: 299,
              totalInvoices: 2,
            },
          }),
        },
        mine: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: {
              content: [
                {
                  createdAt: "2026-04-03T09:00:00.000Z",
                  currency: "CNY",
                  invoiceCode: "3100231130",
                  invoiceId: "INV-1002",
                  invoiceNo: "00012291",
                  status: "COMPLETED",
                  title: "SDKWORK Technology",
                  titleType: "COMPANY",
                  totalAmount: 299,
                  type: "ELECTRONIC",
                  updatedAt: "2026-04-03T10:30:00.000Z",
                },
                {
                  createdAt: "2026-04-02T08:00:00.000Z",
                  currency: "CNY",
                  invoiceId: "INV-1001",
                  status: "DRAFT",
                  title: "SDKWORK Technology",
                  titleType: "COMPANY",
                  totalAmount: 199,
                  type: "SPECIAL",
                  updatedAt: "2026-04-02T08:30:00.000Z",
                },
              ],
              totalElements: 2,
            },
          }),
        },
      },
    });

    const service = createSdkworkInvoiceService({
      commerceService,
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.statistics).toMatchObject({
      completedInvoices: 1,
      pendingInvoices: 1,
      totalAmountCny: 299,
      totalInvoices: 2,
    });
    expect(dashboard.digest).toMatchObject({
      actionableInvoices: 1,
      archivedInvoices: 1,
      completedInvoices: 1,
      processingInvoices: 0,
      totalAmountCny: 498,
      totalInvoices: 2,
    });
    expect(dashboard.invoices[0]).toMatchObject({
      canCancel: true,
      canEdit: false,
      canSubmit: false,
      id: "INV-1002",
      status: "completed",
      title: "SDKWORK Technology",
      type: "electronic",
    });
    expect(dashboard.invoices[1]).toMatchObject({
      canEdit: true,
      canSubmit: true,
      id: "INV-1001",
      status: "draft",
      type: "special",
    });
  });

  it("loads invoice detail and merges item rows from the generated invoice SDK", async () => {
    const commerceService = createCommerceServiceMock({
      invoices: {
        retrieve: vi.fn().mockResolvedValue({
          code: "2000",
          data: {
            bankAccount: "622202000000000001",
            bankName: "ICBC",
            createdAt: "2026-04-03T09:00:00.000Z",
            currency: "CNY",
            electronicUrl: "https://billing.sdkwork.test/invoice/INV-1002.pdf",
            invoiceCode: "3100231130",
            invoiceId: "INV-1002",
            invoiceNo: "00012291",
            invoiceTime: "2026-04-03T10:30:00.000Z",
            registerAddress: "Shanghai",
            registerPhone: "021-10010010",
            status: "COMPLETED",
            taxAmount: 34.5,
            taxNo: "91310000SDKWORK001",
            taxRate: 13,
            title: "SDKWORK Technology",
            titleType: "COMPANY",
            totalAmount: 299,
            type: "ELECTRONIC",
          },
        }),
        items: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: [
              {
                amountExcludingTax: 264.5,
                itemId: "ITEM-1002-1",
                productName: "Pro Annual Subscription",
                quantity: 1,
                specification: "1 year",
                taxAmount: 34.5,
                taxRate: 13,
                totalAmount: 299,
                unit: "license",
                unitPriceExcludingTax: 264.5,
              },
            ],
          }),
        },
      },
    });

    const service = createSdkworkInvoiceService({
      commerceService,
    });

    const detail = await service.getInvoiceDetail("INV-1002");

    expect(detail).toMatchObject({
      bankName: "ICBC",
      currency: "CNY",
      electronicUrl: "https://billing.sdkwork.test/invoice/INV-1002.pdf",
      id: "INV-1002",
      invoiceCode: "3100231130",
      status: "completed",
      title: "SDKWORK Technology",
      totalAmountCny: 299,
      type: "electronic",
    });
    expect(detail.items[0]).toMatchObject({
      id: "ITEM-1002-1",
      name: "Pro Annual Subscription",
      quantity: 1,
      totalAmountCny: 299,
      unit: "license",
    });
  });

  it("routes create, update, submit, and cancel mutations through the generated invoice SDK boundary", async () => {
    const cancel = vi.fn().mockResolvedValue({
      code: "2000",
    });
    const createInvoice = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        createdAt: "2026-04-03T09:00:00.000Z",
        currency: "CNY",
        invoiceId: "INV-1003",
        status: "DRAFT",
        title: "SDKWORK Technology",
        titleType: "COMPANY",
        totalAmount: 499,
        type: "SPECIAL",
      },
    });
    const submit = vi.fn().mockResolvedValue({
      code: "2000",
    });
    const updateInvoice = vi.fn().mockResolvedValue({
      code: "2000",
      data: {
        createdAt: "2026-04-03T09:00:00.000Z",
        currency: "CNY",
        invoiceId: "INV-1003",
        status: "FAILED",
        title: "SDKWORK Technology Ltd.",
        titleType: "COMPANY",
        totalAmount: 499,
        type: "SPECIAL",
        updatedAt: "2026-04-03T09:30:00.000Z",
      },
    });
    const commerceService = createCommerceServiceMock({
      invoices: {
        cancellations: { create: cancel },
        create: createInvoice,
        submissions: { create: submit },
        update: updateInvoice,
      },
    });
    const service = createSdkworkInvoiceService({
      commerceService,
    });

    await expect(
      service.createInvoice({
        taxNo: "91310000SDKWORK001",
        title: "SDKWORK Technology",
        titleType: "company",
        totalAmountCny: 499,
        type: "special",
      }),
    ).resolves.toMatchObject({
      id: "INV-1003",
      status: "draft",
      totalAmountCny: 499,
      type: "special",
    });

    await expect(
      service.updateInvoice({
        bankAccount: "622202000000000001",
        bankName: "ICBC",
        invoiceId: "INV-1003",
        registerAddress: "Shanghai",
        registerPhone: "021-10010010",
        taxNo: "91310000SDKWORK001",
        title: "SDKWORK Technology Ltd.",
      }),
    ).resolves.toMatchObject({
      id: "INV-1003",
      status: "failed",
      title: "SDKWORK Technology Ltd.",
    });

    await expect(service.submitInvoice("INV-1003")).resolves.toEqual({
      invoiceId: "INV-1003",
      submitted: true,
    });

    await expect(
      service.cancelInvoice({
        cancelReason: "Duplicate application",
        invoiceId: "INV-1002",
      }),
    ).resolves.toEqual({
      cancelled: true,
      invoiceId: "INV-1002",
    });

    expect(createInvoice).toHaveBeenCalledWith({
      taxNo: "91310000SDKWORK001",
      title: "SDKWORK Technology",
      titleType: "COMPANY",
      totalAmount: 499,
      type: "SPECIAL",
    });
    expect(updateInvoice).toHaveBeenCalledWith("INV-1003", {
      bankAccount: "622202000000000001",
      bankName: "ICBC",
      registerAddress: "Shanghai",
      registerPhone: "021-10010010",
      taxNo: "91310000SDKWORK001",
      title: "SDKWORK Technology Ltd.",
    });
    expect(submit).toHaveBeenCalledWith("INV-1003", {});
    expect(cancel).toHaveBeenCalledWith("INV-1002", {
      cancelReason: "Duplicate application",
    });
  });

  it("uses localized service copy for zh-CN fallback labels and mutation errors", async () => {
    const zhCommerceService = createCommerceServiceMock({
      invoices: {
        statistics: {
          retrieve: vi.fn().mockResolvedValue({
            code: "2000",
            data: {
              completedInvoices: 0,
              pendingInvoices: 1,
              totalAmount: 88,
              totalInvoices: 1,
            },
          }),
        },
        mine: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: {
              content: [
                {
                  createdAt: "2026-04-03T09:00:00.000Z",
                  invoiceId: "INV-2001",
                  status: "PENDING",
                  totalAmount: 88,
                  type: "ELECTRONIC",
                },
              ],
            },
          }),
        },
        retrieve: vi.fn().mockResolvedValue({
          code: "2000",
          data: {
            createdAt: "2026-04-03T09:00:00.000Z",
            invoiceId: "INV-2001",
            status: "PENDING",
            totalAmount: 88,
            type: "ELECTRONIC",
          },
        }),
        items: {
          list: vi.fn().mockResolvedValue({
            code: "2000",
            data: [
              {
                amountExcludingTax: 77.88,
                itemId: "ITEM-2001-1",
                quantity: 1,
                totalAmount: 88,
              },
            ],
          }),
        },
      },
    });

    const zhDashboardService = createSdkworkInvoiceService({
      commerceService: zhCommerceService,
      locale: "zh-CN",
    });

    const dashboard = await zhDashboardService.getDashboard();
    const detail = await zhDashboardService.getInvoiceDetail("INV-2001");

    expect(dashboard.invoices[0]).toMatchObject({
      currency: "CNY",
      id: "INV-2001",
      status: "pending",
      statusLabel: "\u5f85\u5f00\u7968",
      title: "\u53d1\u7968",
    });
    expect(detail.items[0]).toMatchObject({
      id: "ITEM-2001-1",
      name: "\u53d1\u7968\u884c\u9879",
    });

    resetCommerceServiceMockSession();
    const signInRequiredService = createSdkworkInvoiceService({
      locale: "zh-CN",
    });

    await expect(
      signInRequiredService.createInvoice({
        title: "SDKWORK Technology",
      }),
    ).rejects.toThrow("\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u53d1\u7968\u3002");

    configureCommerceServiceMockSession({ authToken: "invoice-auth-token" });
    const mutationFailureService = createSdkworkInvoiceService({
      commerceService: createCommerceServiceMock({
        invoices: {
          create: vi.fn().mockResolvedValue({
            code: "5000",
          }),
        },
      }),
      locale: "zh-CN",
    });

    await expect(
      mutationFailureService.createInvoice({
        title: "SDKWORK Technology",
      }),
    ).rejects.toThrow("\u521b\u5efa\u53d1\u7968\u5931\u8d25\u3002");
  });
});
