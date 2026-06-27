import {
  createSdkworkAppCapabilityManifest,
  type CreateSdkworkAppCapabilityManifestOptions,
  type SdkworkAppCapabilityManifest,
} from "@sdkwork/appbase-pc-react";
import {
  createSdkworkInvoiceMessages,
  type SdkworkInvoiceMessagesOverrides,
} from "./invoice-copy";

export type SdkworkInvoiceStatus =
  | "cancelled"
  | "completed"
  | "draft"
  | "failed"
  | "pending"
  | "processing"
  | "unknown";

export type SdkworkInvoiceType =
  | "electronic"
  | "normal"
  | "paper"
  | "special"
  | "unknown";

export type SdkworkInvoiceTitleType = "company" | "personal" | "unknown";
export type SdkworkInvoiceFilter = "actionable" | "all" | SdkworkInvoiceStatus;

export interface SdkworkInvoiceWorkspaceManifest extends SdkworkAppCapabilityManifest {
  capability: "invoice";
  routePath: string;
}

export interface CreateInvoiceWorkspaceManifestOptions
  extends Partial<
    Pick<CreateSdkworkAppCapabilityManifestOptions, "description" | "host" | "id" | "packageNames" | "theme" | "title">
  > {
  locale?: string | null;
  messages?: SdkworkInvoiceMessagesOverrides;
  routePath?: string;
}

export interface SdkworkInvoiceRouteIntent {
  filter?: SdkworkInvoiceFilter;
  focusWindow: boolean;
  invoiceId?: string;
  route: string;
  source: "invoice-workspace";
  type: "invoice-route-intent";
}

export interface CreateInvoiceRouteIntentOptions {
  basePath?: string;
  filter?: SdkworkInvoiceFilter;
  focusWindow?: boolean;
  invoiceId?: string;
}

export interface SdkworkInvoiceSummaryDigestInput {
  id: string;
  status: SdkworkInvoiceStatus;
  totalAmountCny: number | null;
}

export interface SdkworkInvoiceStatusDigest {
  actionableInvoices: number;
  archivedInvoices: number;
  completedInvoices: number;
  processingInvoices: number;
  totalAmountCny: number;
  totalInvoices: number;
}

function normalizeBasePath(basePath: string | undefined): string {
  const normalized = (basePath ?? "/invoices").trim();
  if (!normalized || normalized === "/") {
    return "/invoices";
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function summarizeSdkworkInvoices(
  invoices: readonly SdkworkInvoiceSummaryDigestInput[],
): SdkworkInvoiceStatusDigest {
  return invoices.reduce<SdkworkInvoiceStatusDigest>(
    (summary, invoice) => {
      summary.totalInvoices += 1;
      summary.totalAmountCny += toSafeNumber(invoice.totalAmountCny);

      if (invoice.status === "draft" || invoice.status === "failed") {
        summary.actionableInvoices += 1;
      }

      if (invoice.status === "pending" || invoice.status === "processing") {
        summary.processingInvoices += 1;
      }

      if (invoice.status === "completed") {
        summary.completedInvoices += 1;
        summary.archivedInvoices += 1;
      }

      if (invoice.status === "cancelled") {
        summary.archivedInvoices += 1;
      }

      return summary;
    },
    {
      actionableInvoices: 0,
      archivedInvoices: 0,
      completedInvoices: 0,
      processingInvoices: 0,
      totalAmountCny: 0,
      totalInvoices: 0,
    },
  );
}

export function createInvoiceWorkspaceManifest({
  description,
  host,
  id = "sdkwork-invoice",
  locale,
  messages,
  packageNames = ["@sdkwork/commerce-pc-invoice"],
  routePath = "/invoices",
  theme,
  title,
}: CreateInvoiceWorkspaceManifestOptions = {}): SdkworkInvoiceWorkspaceManifest {
  const copy = createSdkworkInvoiceMessages(locale, messages).manifest;

  return {
    ...createSdkworkAppCapabilityManifest({
      description: description ?? copy.description,
      host,
      id,
      packageNames,
      theme,
      title: title ?? copy.title,
    }),
    capability: "invoice",
    routePath: normalizeBasePath(routePath),
  };
}

export function createInvoiceRouteIntent(
  options: CreateInvoiceRouteIntentOptions = {},
): SdkworkInvoiceRouteIntent {
  const basePath = normalizeBasePath(options.basePath);
  const queryParams = new URLSearchParams();

  if (options.filter) {
    queryParams.set("filter", options.filter);
  }

  if (options.invoiceId) {
    queryParams.set("invoiceId", options.invoiceId);
  }

  const querySuffix = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return {
    focusWindow: options.focusWindow !== false,
    ...(options.filter ? { filter: options.filter } : {}),
    ...(options.invoiceId ? { invoiceId: options.invoiceId } : {}),
    route: `${basePath}${querySuffix}`,
    source: "invoice-workspace",
    type: "invoice-route-intent",
  };
}

export const invoicePackageMeta = {
  architecture: "pc-react",
  domain: "commerce",
  package: "@sdkwork/commerce-pc-invoice",
  status: "ready",
} as const;

export type InvoicePackageMeta = typeof invoicePackageMeta;
