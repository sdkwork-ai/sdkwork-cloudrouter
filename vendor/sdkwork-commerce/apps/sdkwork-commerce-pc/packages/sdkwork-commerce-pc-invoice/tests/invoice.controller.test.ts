import { describe, expect, it, vi } from "vitest";
import { createSdkworkInvoiceController } from "../src";

describe("sdkwork-commerce-pc-invoice controller", () => {
  it("bootstraps invoice state, filters invoices, opens detail, and refreshes after create and submit actions", async () => {
    const firstDashboard = {
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
        {
          canCancel: true,
          canEdit: false,
          canSubmit: false,
          createdAt: "2026-04-03T09:00:00.000Z",
          currency: "CNY",
          id: "INV-1002",
          status: "completed" as const,
          statusLabel: "Completed",
          title: "SDKWORK Technology",
          titleType: "company" as const,
          totalAmountCny: 299,
          type: "electronic" as const,
          updatedAt: "2026-04-03T10:30:00.000Z",
        },
      ],
      statistics: {
        completedInvoices: 1,
        pendingInvoices: 0,
        totalAmountCny: 299,
        totalInvoices: 2,
      },
    };
    const secondDashboard = {
      ...firstDashboard,
      digest: {
        actionableInvoices: 0,
        archivedInvoices: 1,
        completedInvoices: 1,
        processingInvoices: 1,
        totalAmountCny: 997,
        totalInvoices: 3,
      },
      invoices: [
        {
          canCancel: false,
          canEdit: false,
          canSubmit: false,
          createdAt: "2026-04-03T11:00:00.000Z",
          currency: "CNY",
          id: "INV-1003",
          status: "pending" as const,
          statusLabel: "Pending",
          title: "SDKWORK Technology",
          titleType: "company" as const,
          totalAmountCny: 499,
          type: "special" as const,
          updatedAt: "2026-04-03T11:10:00.000Z",
        },
        ...firstDashboard.invoices,
      ],
      statistics: {
        completedInvoices: 1,
        pendingInvoices: 1,
        totalAmountCny: 299,
        totalInvoices: 3,
      },
    };
    const detail = {
      bankAccount: "622202000000000001",
      bankName: "ICBC",
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
    };
    const service = {
      cancelInvoice: vi.fn(),
      createInvoice: vi.fn().mockResolvedValue({
        id: "INV-1003",
        status: "draft" as const,
      }),
      getDashboard: vi
        .fn()
        .mockResolvedValueOnce(firstDashboard)
        .mockResolvedValueOnce(secondDashboard)
        .mockResolvedValueOnce(secondDashboard),
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
      getInvoiceDetail: vi.fn().mockResolvedValue(detail),
      submitInvoice: vi.fn().mockResolvedValue({
        invoiceId: "INV-1003",
        submitted: true,
      }),
      updateInvoice: vi.fn(),
    };

    const controller = createSdkworkInvoiceController({
      service,
    });

    await controller.bootstrap();
    expect(controller.getState()).toMatchObject({
      activeFilter: "all",
      isBootstrapped: true,
      visibleInvoices: firstDashboard.invoices,
    });

    controller.setFilter("draft");
    expect(controller.getState().visibleInvoices).toHaveLength(1);

    await controller.openDetail("INV-1001");
    expect(controller.getState()).toMatchObject({
      detail,
      isDetailOpen: true,
      selectedInvoiceId: "INV-1001",
    });

    controller.openCreateDialog();
    expect(controller.getState().editorMode).toBe("create");

    await controller.createInvoice({
      taxNo: "91310000SDKWORK001",
      title: "SDKWORK Technology",
      titleType: "company",
      totalAmountCny: 499,
      type: "special",
    });
    expect(service.createInvoice).toHaveBeenCalledWith({
      taxNo: "91310000SDKWORK001",
      title: "SDKWORK Technology",
      titleType: "company",
      totalAmountCny: 499,
      type: "special",
    });
    expect(controller.getState().dashboard.statistics.totalInvoices).toBe(3);

    await controller.submitInvoice("INV-1003");
    expect(service.submitInvoice).toHaveBeenCalledWith("INV-1003");
    expect(controller.getState().dashboard.digest.processingInvoices).toBe(1);
  });

  it("uses localized controller fallback messages for zh-CN", async () => {
    const bootstrapController = createSdkworkInvoiceController({
      locale: "zh-CN",
      service: {
        cancelInvoice: vi.fn(),
        createInvoice: vi.fn(),
        getDashboard: vi.fn().mockRejectedValue("network-timeout"),
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

    await expect(bootstrapController.bootstrap()).rejects.toBe("network-timeout");
    expect(bootstrapController.getState().lastError).toBe("\u52a0\u8f7d\u53d1\u7968\u4e2d\u5fc3\u5931\u8d25\u3002");

    const mutationController = createSdkworkInvoiceController({
      locale: "zh-CN",
      service: {
        cancelInvoice: vi.fn(),
        createInvoice: vi.fn().mockRejectedValue("mutation-timeout"),
        getDashboard: vi.fn().mockResolvedValue({
          digest: {
            actionableInvoices: 1,
            archivedInvoices: 0,
            completedInvoices: 0,
            processingInvoices: 0,
            totalAmountCny: 88,
            totalInvoices: 1,
          },
          invoices: [
            {
              canCancel: false,
              canDownload: false,
              canEdit: true,
              canSubmit: true,
              createdAt: "2026-04-03T09:00:00.000Z",
              currency: "CNY",
              id: "INV-2001",
              status: "draft" as const,
              statusLabel: "Draft",
              title: "SDKWORK Technology",
              titleType: "company" as const,
              totalAmountCny: 88,
              type: "electronic" as const,
            },
          ],
          statistics: {
            completedInvoices: 0,
            pendingInvoices: 0,
            totalAmountCny: 88,
            totalInvoices: 1,
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
        getInvoiceDetail: vi.fn(),
        submitInvoice: vi.fn(),
        updateInvoice: vi.fn(),
      },
    });

    await mutationController.bootstrap();
    await expect(
      mutationController.createInvoice({
        title: "SDKWORK Technology",
      }),
    ).rejects.toBe("mutation-timeout");
    expect(mutationController.getState().lastError).toBe("\u521b\u5efa\u53d1\u7968\u5931\u8d25\u3002");
  });
});
