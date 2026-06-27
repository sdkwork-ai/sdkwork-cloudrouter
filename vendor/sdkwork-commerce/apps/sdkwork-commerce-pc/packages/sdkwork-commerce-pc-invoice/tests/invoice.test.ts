import { describe, expect, it } from "vitest";
import {
  createInvoiceRouteIntent,
  createInvoiceWorkspaceManifest,
  summarizeSdkworkInvoices,
} from "../src";

describe("sdkwork-commerce-pc-invoice headless helpers", () => {
  it("creates invoice workspace manifests and route intents that align to the shared commerce contract", () => {
    const manifest = createInvoiceWorkspaceManifest();
    const zhManifest = createInvoiceWorkspaceManifest({
      locale: "zh-CN",
    });
    const routeIntent = createInvoiceRouteIntent({
      filter: "draft",
      invoiceId: "INV-1001",
    });

    expect(manifest).toMatchObject({
      capability: "invoice",
      packageNames: [
        "@sdkwork/commerce-pc-invoice",
      ],
      routePath: "/invoices",
    });
    expect(zhManifest).toMatchObject({
      description: "\u7528\u4e8e\u7ba1\u7406\u5f00\u7968\u5355\u636e\u3001\u7a0e\u52a1\u8349\u7a3f\u6d41\u7a0b\u4e0e\u53d1\u7968\u8be6\u60c5\u8def\u7531\u7684\u5de5\u4f5c\u533a\u3002",
      title: "\u53d1\u7968",
    });
    expect(routeIntent).toEqual({
      filter: "draft",
      focusWindow: true,
      invoiceId: "INV-1001",
      route: "/invoices?filter=draft&invoiceId=INV-1001",
      source: "invoice-workspace",
      type: "invoice-route-intent",
    });
  });

  it("summarizes invoice collections into reusable status digests", () => {
    const summary = summarizeSdkworkInvoices([
      {
        id: "INV-1001",
        status: "draft",
        totalAmountCny: 199,
      },
      {
        id: "INV-1002",
        status: "completed",
        totalAmountCny: 299,
      },
      {
        id: "INV-1003",
        status: "processing",
        totalAmountCny: 499,
      },
      {
        id: "INV-1004",
        status: "failed",
        totalAmountCny: 99,
      },
    ]);

    expect(summary).toEqual({
      actionableInvoices: 2,
      archivedInvoices: 1,
      completedInvoices: 1,
      processingInvoices: 1,
      totalAmountCny: 1096,
      totalInvoices: 4,
    });
  });
});
