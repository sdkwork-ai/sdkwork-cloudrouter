export type SdkworkInvoiceLocale = "en-US" | "zh-CN";

export type SdkworkInvoiceMessagesOverrides = DeepPartial<SdkworkInvoiceMessages>;

export interface SdkworkInvoiceMessages {
  actions: {
    cancelInvoice: string;
    close: string;
    createDraft: string;
    edit: string;
    newInvoice: string;
    openElectronicInvoice: string;
    saveChanges: string;
    submitInvoice: string;
    viewDetails: string;
  };
  common: {
    emptyValue: string;
  };
  controller: {
    bootstrapFailed: string;
    cancelFailed: string;
    createFailed: string;
    detailFailed: string;
    submitFailed: string;
    updateFailed: string;
  };
  delivery: {
    description: string;
    title: string;
  };
  detail: {
    description: string;
    invoiceType: string;
    loading: string;
    status: string;
    summaryValue: string;
    title: string;
    totalAmount: string;
  };
  editor: {
    createDescription: string;
    createTitle: string;
    editDescription: string;
    editTitle: string;
    errorTitle: string;
    fields: {
      bankAccount: string;
      bankName: string;
      invoiceTitle: string;
      invoiceType: string;
      registerAddress: string;
      registerPhone: string;
      taxNumber: string;
      titleType: string;
      totalAmount: string;
    };
  };
  filters: {
    actionable: string;
    all: string;
    cancelled: string;
    completed: string;
    draft: string;
    failed: string;
    pending: string;
    processing: string;
    unknown: string;
  };
  invoiceType: {
    electronic: string;
    normal: string;
    paper: string;
    special: string;
    unknown: string;
  };
  manifest: {
    description: string;
    title: string;
  };
  items: {
    description: string;
    empty: string;
    metaValue: string;
    specification: string;
    title: string;
  };
  overview: {
    createdAt: string;
    currency: string;
    description: string;
    invoiceCode: string;
    invoiceNo: string;
    invoiceTime: string;
    title: string;
    titleType: string;
  };
  page: {
    description: string;
    errorTitle: string;
    eyebrow: string;
    loading: string;
    title: string;
  };
  service: {
    cancelFailed: string;
    clientMethodUnavailable: string;
    createFailed: string;
    defaultCurrency: string;
    detailFailed: string;
    itemFallbackName: string;
    requestFailed: string;
    signInRequired: string;
    submitFailed: string;
    summaryFallbackTitle: string;
    updateFailed: string;
  };
  stats: {
    actionableDrafts: string;
    actionableDraftsDescription: string;
    actionableDraftsMeta: string;
    completedAmount: string;
    completedAmountDescription: string;
    completedAmountMeta: string;
    loadedInvoices: string;
    loadedInvoicesDescription: string;
    loadedInvoicesMeta: string;
    processingQueue: string;
    processingQueueDescription: string;
    processingQueueMeta: string;
  };
  status: {
    cancelled: string;
    completed: string;
    draft: string;
    failed: string;
    pending: string;
    processing: string;
    unknown: string;
  };
  tax: {
    amountExcludingTax: string;
    bankAccount: string;
    bankName: string;
    description: string;
    registerAddress: string;
    registerPhone: string;
    taxAmount: string;
    taxNo: string;
    taxRate: string;
    title: string;
  };
  titleType: {
    company: string;
    personal: string;
    unknown: string;
  };
  views: {
    draftDocument: string;
    empty: string;
    eyebrow: string;
    title: string;
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDeep<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) {
    return base;
  }

  const output: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      continue;
    }

    const baseValue = output[key];
    output[key] = isRecord(baseValue) && isRecord(value)
      ? mergeDeep(baseValue, value)
      : value;
  }

  return output as T;
}

const EN_US_MESSAGES: SdkworkInvoiceMessages = {
  actions: {
    cancelInvoice: "Cancel invoice",
    close: "Close",
    createDraft: "Create draft",
    edit: "Edit",
    newInvoice: "New invoice",
    openElectronicInvoice: "Open electronic invoice",
    saveChanges: "Save changes",
    submitInvoice: "Submit invoice",
    viewDetails: "View details",
  },
  common: {
    emptyValue: "--",
  },
  controller: {
    bootstrapFailed: "Failed to load invoice center.",
    cancelFailed: "Failed to cancel invoice.",
    createFailed: "Failed to create invoice.",
    detailFailed: "Failed to load invoice detail.",
    submitFailed: "Failed to submit invoice.",
    updateFailed: "Failed to update invoice.",
  },
  delivery: {
    description: "Electronic delivery channel for completed invoices.",
    title: "Delivery",
  },
  detail: {
    description: "Inspect invoice metadata, tax details, and line items.",
    invoiceType: "Invoice type",
    loading: "Loading invoice detail...",
    status: "Status",
    summaryValue: "Invoice #{id}",
    title: "Invoice detail",
    totalAmount: "Total amount",
  },
  editor: {
    createDescription: "Create a reusable billing document draft with tax-ready metadata.",
    createTitle: "Create invoice",
    editDescription: "Refine draft or failed invoice metadata before submitting it again.",
    editTitle: "Edit invoice",
    errorTitle: "Invoice editor error",
    fields: {
      bankAccount: "Bank account",
      bankName: "Bank name",
      invoiceTitle: "Invoice title",
      invoiceType: "Invoice type",
      registerAddress: "Register address",
      registerPhone: "Register phone",
      taxNumber: "Tax number",
      titleType: "Title type",
      totalAmount: "Total amount",
    },
  },
  filters: {
    actionable: "Actionable",
    all: "All",
    cancelled: "Cancelled",
    completed: "Completed",
    draft: "Draft",
    failed: "Failed",
    pending: "Pending",
    processing: "Processing",
    unknown: "Unknown",
  },
  invoiceType: {
    electronic: "Electronic",
    normal: "Normal VAT",
    paper: "Paper",
    special: "Special VAT",
    unknown: "Unknown",
  },
  manifest: {
    description: "Invoice workspace for billing documents, tax-ready draft workflows, and invoice-detail routing.",
    title: "Invoices",
  },
  items: {
    description: "Line items included in this billing document.",
    empty: "No invoice items were returned for this document.",
    metaValue: "Qty {quantity}{unitSuffix} | {amount}",
    specification: "Specification",
    title: "Items",
  },
  overview: {
    createdAt: "Created",
    currency: "Currency",
    description: "Core document identifiers and issue timeline.",
    invoiceCode: "Invoice code",
    invoiceNo: "Invoice number",
    invoiceTime: "Issued",
    title: "Overview",
    titleType: "Title type",
  },
  page: {
    description: "Create tax-ready billing documents, monitor issuance progress, and inspect issued invoice details from one reusable Sdkwork-grade workspace.",
    errorTitle: "Invoice center error",
    eyebrow: "Commercial Billing",
    loading: "Loading invoice center...",
    title: "Invoice Center",
  },
  service: {
    cancelFailed: "Failed to cancel invoice.",
    clientMethodUnavailable: "{name} is unavailable on the current app client.",
    createFailed: "Failed to create invoice.",
    defaultCurrency: "CNY",
    detailFailed: "Failed to load invoice detail.",
    itemFallbackName: "Invoice item",
    requestFailed: "Request failed.",
    signInRequired: "Please sign in to manage invoices.",
    submitFailed: "Failed to submit invoice.",
    summaryFallbackTitle: "Invoice",
    updateFailed: "Failed to update invoice.",
  },
  stats: {
    actionableDrafts: "Actionable drafts",
    actionableDraftsDescription: "Draft and failed invoices that still need user attention.",
    actionableDraftsMeta: "{count} actionable",
    completedAmount: "Completed amount",
    completedAmountDescription: "Completed invoice amount tracked by the backend statistics feed.",
    completedAmountMeta: "{count} total",
    loadedInvoices: "Loaded invoices",
    loadedInvoicesDescription: "Local digest amount across all invoices loaded into the workspace.",
    loadedInvoicesMeta: "{amount}",
    processingQueue: "Processing queue",
    processingQueueDescription: "Invoices currently waiting for tax issuance or processing.",
    processingQueueMeta: "{count} pending",
  },
  status: {
    cancelled: "Cancelled",
    completed: "Completed",
    draft: "Draft",
    failed: "Failed",
    pending: "Pending",
    processing: "Processing",
    unknown: "Unknown",
  },
  tax: {
    amountExcludingTax: "Amount before tax",
    bankAccount: "Bank account",
    bankName: "Bank name",
    description: "Tax registration and issuer information.",
    registerAddress: "Register address",
    registerPhone: "Register phone",
    taxAmount: "Tax amount",
    taxNo: "Tax number",
    taxRate: "Tax rate",
    title: "Tax profile",
  },
  titleType: {
    company: "Company",
    personal: "Personal",
    unknown: "Unknown",
  },
  views: {
    draftDocument: "Draft document",
    empty: "No invoices matched the current filter. Create a new invoice draft or switch to another status view.",
    eyebrow: "Invoices",
    title: "Billing document history",
  },
};

const ZH_CN_MESSAGES: SdkworkInvoiceMessages = {
  actions: {
    cancelInvoice: "\u4f5c\u5e9f\u53d1\u7968",
    close: "\u5173\u95ed",
    createDraft: "\u521b\u5efa\u8349\u7a3f",
    edit: "\u7f16\u8f91",
    newInvoice: "\u65b0\u5efa\u53d1\u7968",
    openElectronicInvoice: "\u6253\u5f00\u7535\u5b50\u53d1\u7968",
    saveChanges: "\u4fdd\u5b58\u4fee\u6539",
    submitInvoice: "\u63d0\u4ea4\u53d1\u7968",
    viewDetails: "\u67e5\u770b\u8be6\u60c5",
  },
  common: {
    emptyValue: "--",
  },
  controller: {
    bootstrapFailed: "\u52a0\u8f7d\u53d1\u7968\u4e2d\u5fc3\u5931\u8d25\u3002",
    cancelFailed: "\u4f5c\u5e9f\u53d1\u7968\u5931\u8d25\u3002",
    createFailed: "\u521b\u5efa\u53d1\u7968\u5931\u8d25\u3002",
    detailFailed: "\u52a0\u8f7d\u53d1\u7968\u8be6\u60c5\u5931\u8d25\u3002",
    submitFailed: "\u63d0\u4ea4\u53d1\u7968\u5931\u8d25\u3002",
    updateFailed: "\u66f4\u65b0\u53d1\u7968\u5931\u8d25\u3002",
  },
  delivery: {
    description: "\u5df2\u5b8c\u6210\u53d1\u7968\u7684\u7535\u5b50\u4ea4\u4ed8\u5165\u53e3\u3002",
    title: "\u4ea4\u4ed8",
  },
  detail: {
    description: "\u67e5\u770b\u53d1\u7968\u5143\u6570\u636e\u3001\u7a0e\u52a1\u4fe1\u606f\u548c\u884c\u9879\u660e\u7ec6\u3002",
    invoiceType: "\u53d1\u7968\u7c7b\u578b",
    loading: "\u6b63\u5728\u52a0\u8f7d\u53d1\u7968\u8be6\u60c5...",
    status: "\u72b6\u6001",
    summaryValue: "\u53d1\u7968 #{id}",
    title: "\u53d1\u7968\u8be6\u60c5",
    totalAmount: "\u603b\u91d1\u989d",
  },
  editor: {
    createDescription: "\u521b\u5efa\u5e26\u6709\u7a0e\u52a1\u5143\u6570\u636e\u7684\u53ef\u590d\u7528\u53d1\u7968\u8349\u7a3f\u3002",
    createTitle: "\u521b\u5efa\u53d1\u7968",
    editDescription: "\u5728\u91cd\u65b0\u63d0\u4ea4\u4e4b\u524d\uff0c\u8865\u5168\u8349\u7a3f\u6216\u5f02\u5e38\u53d1\u7968\u7684\u5143\u6570\u636e\u3002",
    editTitle: "\u7f16\u8f91\u53d1\u7968",
    errorTitle: "\u53d1\u7968\u7f16\u8f91\u5f02\u5e38",
    fields: {
      bankAccount: "\u5f00\u6237\u8d26\u53f7",
      bankName: "\u5f00\u6237\u94f6\u884c",
      invoiceTitle: "\u53d1\u7968\u6298\u5934",
      invoiceType: "\u53d1\u7968\u7c7b\u578b",
      registerAddress: "\u6ce8\u518c\u5730\u5740",
      registerPhone: "\u6ce8\u518c\u7535\u8bdd",
      taxNumber: "\u7a0e\u53f7",
      titleType: "\u6298\u5934\u7c7b\u578b",
      totalAmount: "\u603b\u91d1\u989d",
    },
  },
  filters: {
    actionable: "\u5f85\u5904\u7406",
    all: "\u5168\u90e8",
    cancelled: "\u5df2\u4f5c\u5e9f",
    completed: "\u5df2\u5b8c\u6210",
    draft: "\u8349\u7a3f",
    failed: "\u5f02\u5e38",
    pending: "\u5f85\u5f00\u7968",
    processing: "\u5904\u7406\u4e2d",
    unknown: "\u672a\u77e5",
  },
  invoiceType: {
    electronic: "\u7535\u5b50\u53d1\u7968",
    normal: "\u666e\u901a\u53d1\u7968",
    paper: "\u7eb8\u8d28\u53d1\u7968",
    special: "\u589e\u503c\u7a0e\u4e13\u7968",
    unknown: "\u672a\u77e5",
  },
  manifest: {
    description: "\u7528\u4e8e\u7ba1\u7406\u5f00\u7968\u5355\u636e\u3001\u7a0e\u52a1\u8349\u7a3f\u6d41\u7a0b\u4e0e\u53d1\u7968\u8be6\u60c5\u8def\u7531\u7684\u5de5\u4f5c\u533a\u3002",
    title: "\u53d1\u7968",
  },
  items: {
    description: "\u5f53\u524d\u53d1\u7968\u5305\u542b\u7684\u5546\u54c1\u6216\u670d\u52a1\u884c\u9879\u3002",
    empty: "\u5f53\u524d\u53d1\u7968\u6682\u672a\u8fd4\u56de\u884c\u9879\u660e\u7ec6\u3002",
    metaValue: "\u6570\u91cf {quantity}{unitSuffix} | {amount}",
    specification: "\u89c4\u683c",
    title: "\u884c\u9879",
  },
  overview: {
    createdAt: "\u521b\u5efa\u65f6\u95f4",
    currency: "\u5e01\u79cd",
    description: "\u67e5\u770b\u53d1\u7968\u6807\u8bc6\u3001\u6298\u5934\u548c\u5f00\u7968\u65f6\u95f4\u7ebf\u7d22\u3002",
    invoiceCode: "\u53d1\u7968\u4ee3\u7801",
    invoiceNo: "\u53d1\u7968\u53f7\u7801",
    invoiceTime: "\u5f00\u7968\u65f6\u95f4",
    title: "\u6982\u89c8",
    titleType: "\u6298\u5934\u7c7b\u578b",
  },
  page: {
    description: "\u5728\u4e00\u4e2a\u53ef\u590d\u7528\u7684 Sdkwork \u98ce\u683c\u5de5\u4f5c\u533a\u4e2d\uff0c\u96c6\u4e2d\u5efa\u7acb\u7a0e\u52a1\u53ef\u4ea4\u4ed8\u5355\u636e\uff0c\u8ddf\u8e2a\u5f00\u7968\u8fdb\u5ea6\u5e76\u67e5\u770b\u8be6\u60c5\u3002",
    errorTitle: "\u53d1\u7968\u4e2d\u5fc3\u5f02\u5e38",
    eyebrow: "\u5546\u4e1a\u5316\u5f00\u7968",
    loading: "\u6b63\u5728\u52a0\u8f7d\u53d1\u7968\u4e2d\u5fc3...",
    title: "\u53d1\u7968\u4e2d\u5fc3",
  },
  service: {
    cancelFailed: "\u4f5c\u5e9f\u53d1\u7968\u5931\u8d25\u3002",
    clientMethodUnavailable: "\u5f53\u524d\u5e94\u7528\u5ba2\u6237\u7aef\u672a\u63d0\u4f9b {name} \u80fd\u529b\u3002",
    createFailed: "\u521b\u5efa\u53d1\u7968\u5931\u8d25\u3002",
    defaultCurrency: "CNY",
    detailFailed: "\u52a0\u8f7d\u53d1\u7968\u8be6\u60c5\u5931\u8d25\u3002",
    itemFallbackName: "\u53d1\u7968\u884c\u9879",
    requestFailed: "\u8bf7\u6c42\u5931\u8d25\u3002",
    signInRequired: "\u8bf7\u5148\u767b\u5f55\u540e\u518d\u7ba1\u7406\u53d1\u7968\u3002",
    submitFailed: "\u63d0\u4ea4\u53d1\u7968\u5931\u8d25\u3002",
    summaryFallbackTitle: "\u53d1\u7968",
    updateFailed: "\u66f4\u65b0\u53d1\u7968\u5931\u8d25\u3002",
  },
  stats: {
    actionableDrafts: "\u5f85\u5904\u7406\u8349\u7a3f",
    actionableDraftsDescription: "\u9700\u8981\u7ee7\u7eed\u8865\u5168\u6216\u91cd\u65b0\u63d0\u4ea4\u7684\u8349\u7a3f\u4e0e\u5f02\u5e38\u53d1\u7968\u3002",
    actionableDraftsMeta: "\u5f85\u5904\u7406 {count} \u4efd",
    completedAmount: "\u5df2\u5f00\u7968\u91d1\u989d",
    completedAmountDescription: "\u540e\u7aef\u7edf\u8ba1\u8fd4\u56de\u7684\u5df2\u5b8c\u6210\u5f00\u7968\u91d1\u989d\u3002",
    completedAmountMeta: "\u5171 {count} \u4efd",
    loadedInvoices: "\u5df2\u52a0\u8f7d\u53d1\u7968",
    loadedInvoicesDescription: "\u5f53\u524d\u5de5\u4f5c\u533a\u4e2d\u5df2\u52a0\u8f7d\u7684\u53d1\u7968\u6458\u8981\u4e0e\u603b\u989d\u3002",
    loadedInvoicesMeta: "{amount}",
    processingQueue: "\u5904\u7406\u4e2d\u961f\u5217",
    processingQueueDescription: "\u6b63\u5728\u7b49\u5f85\u5f00\u7968\u6216\u7a0e\u52a1\u5904\u7406\u7684\u53d1\u7968\u3002",
    processingQueueMeta: "\u5f85\u5904\u7406 {count} \u4efd",
  },
  status: {
    cancelled: "\u5df2\u4f5c\u5e9f",
    completed: "\u5df2\u5b8c\u6210",
    draft: "\u8349\u7a3f",
    failed: "\u5f02\u5e38",
    pending: "\u5f85\u5f00\u7968",
    processing: "\u5904\u7406\u4e2d",
    unknown: "\u672a\u77e5",
  },
  tax: {
    amountExcludingTax: "\u4e0d\u542b\u7a0e\u91d1\u989d",
    bankAccount: "\u5f00\u6237\u8d26\u53f7",
    bankName: "\u5f00\u6237\u94f6\u884c",
    description: "\u7a0e\u52a1\u767b\u8bb0\u548c\u5f00\u7968\u4e3b\u4f53\u4fe1\u606f\u3002",
    registerAddress: "\u6ce8\u518c\u5730\u5740",
    registerPhone: "\u6ce8\u518c\u7535\u8bdd",
    taxAmount: "\u7a0e\u989d",
    taxNo: "\u7a0e\u53f7",
    taxRate: "\u7a0e\u7387",
    title: "\u7a0e\u52a1\u6863\u6848",
  },
  titleType: {
    company: "\u4f01\u4e1a",
    personal: "\u4e2a\u4eba",
    unknown: "\u672a\u77e5",
  },
  views: {
    draftDocument: "\u8349\u7a3f\u5355\u636e",
    empty: "\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u5339\u914d\u7684\u53d1\u7968\uff0c\u53ef\u4ee5\u65b0\u5efa\u8349\u7a3f\u6216\u5207\u6362\u72b6\u6001\u89c6\u56fe\u3002",
    eyebrow: "\u53d1\u7968",
    title: "\u5f00\u7968\u5386\u53f2",
  },
};

const SDKWORK_INVOICE_MESSAGES: Record<SdkworkInvoiceLocale, SdkworkInvoiceMessages> = {
  "en-US": EN_US_MESSAGES,
  "zh-CN": ZH_CN_MESSAGES,
};

export function normalizeSdkworkInvoiceLocale(locale?: string | null): SdkworkInvoiceLocale {
  const normalized = String(locale || "").trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}

export function createSdkworkInvoiceMessages(
  locale?: string | null,
  overrides?: SdkworkInvoiceMessagesOverrides,
): SdkworkInvoiceMessages {
  return mergeDeep(
    SDKWORK_INVOICE_MESSAGES[normalizeSdkworkInvoiceLocale(locale)],
    overrides,
  );
}
