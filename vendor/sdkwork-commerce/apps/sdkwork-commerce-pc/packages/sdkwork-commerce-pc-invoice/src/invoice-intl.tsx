import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import type {
  SdkworkInvoiceFilter,
  SdkworkInvoiceStatus,
} from "./invoice";
import {
  createSdkworkInvoiceMessages,
  normalizeSdkworkInvoiceLocale,
  type SdkworkInvoiceMessages,
  type SdkworkInvoiceMessagesOverrides,
} from "./invoice-copy";

export interface SdkworkInvoiceIntlValue {
  copy: SdkworkInvoiceMessages;
  formatCurrencyCny: (value: number | null | undefined) => string;
  formatDetailSummary: (invoiceId: string | number) => string;
  formatFilter: (filter: SdkworkInvoiceFilter) => string;
  formatInvoiceType: (value: string | null | undefined) => string;
  formatItemMeta: (
    quantity: number | null | undefined,
    unit: string | null | undefined,
    totalAmountCny: number | null | undefined,
  ) => string;
  formatStatus: (status: string | null | undefined, fallbackLabel?: string | null | undefined) => string;
  formatTemplate: (template: string, values: Record<string, string>) => string;
  formatTimestamp: (value: string | undefined) => string;
  formatTitleType: (value: string | null | undefined) => string;
  locale: string;
}

export interface SdkworkInvoiceIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkInvoiceMessagesOverrides;
}

function interpolateTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, value),
    template,
  );
}

function normalizeStatusKey(
  value: string | null | undefined,
): keyof SdkworkInvoiceMessages["status"] {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "cancelled"
    || normalized === "completed"
    || normalized === "draft"
    || normalized === "failed"
    || normalized === "pending"
    || normalized === "processing"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeFilterKey(value: SdkworkInvoiceFilter): keyof SdkworkInvoiceMessages["filters"] {
  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "actionable"
    || normalized === "all"
    || normalized === "cancelled"
    || normalized === "completed"
    || normalized === "draft"
    || normalized === "failed"
    || normalized === "pending"
    || normalized === "processing"
  ) {
    return normalized as keyof SdkworkInvoiceMessages["filters"];
  }

  return "unknown";
}

function normalizeInvoiceTypeKey(
  value: string | null | undefined,
): keyof SdkworkInvoiceMessages["invoiceType"] {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "electronic"
    || normalized === "normal"
    || normalized === "paper"
    || normalized === "special"
  ) {
    return normalized;
  }

  return "unknown";
}

function normalizeTitleTypeKey(
  value: string | null | undefined,
): keyof SdkworkInvoiceMessages["titleType"] {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "company" || normalized === "personal") {
    return normalized;
  }

  return "unknown";
}

function createSdkworkInvoiceIntlValue(
  locale?: string | null,
  overrides?: SdkworkInvoiceMessagesOverrides,
): SdkworkInvoiceIntlValue {
  const resolvedLocale = normalizeSdkworkInvoiceLocale(locale);
  const copy = createSdkworkInvoiceMessages(resolvedLocale, overrides);

  return {
    copy,
    formatCurrencyCny(value) {
      return formatSdkworkCurrencyCny(value, resolvedLocale);
    },
    formatDetailSummary(invoiceId) {
      return interpolateTemplate(copy.detail.summaryValue, {
        id: String(invoiceId),
      });
    },
    formatFilter(filter) {
      return copy.filters[normalizeFilterKey(filter)];
    },
    formatInvoiceType(value) {
      return copy.invoiceType[normalizeInvoiceTypeKey(value)];
    },
    formatItemMeta(quantity, unit, totalAmountCny) {
      const unitValue = String(unit || "").trim();
      const unitSuffix = unitValue ? ` ${unitValue}` : "";

      return interpolateTemplate(copy.items.metaValue, {
        amount: formatSdkworkCurrencyCny(totalAmountCny, resolvedLocale),
        quantity: String(quantity ?? 0),
        unitSuffix,
      });
    },
    formatStatus(status, fallbackLabel) {
      const key = normalizeStatusKey(status);
      if (
        key === "unknown"
        && fallbackLabel
        && fallbackLabel.trim()
        && fallbackLabel.trim().toLowerCase() !== "unknown"
      ) {
        return fallbackLabel;
      }

      return copy.status[key];
    },
    formatTemplate(template, values) {
      return interpolateTemplate(template, values);
    },
    formatTimestamp(value) {
      if (!value) {
        return copy.common.emptyValue;
      }

      const timestamp = new Date(value);
      if (Number.isNaN(timestamp.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp);
    },
    formatTitleType(value) {
      return copy.titleType[normalizeTitleTypeKey(value)];
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_INVOICE_INTL = createSdkworkInvoiceIntlValue();

const SdkworkInvoiceIntlContext = createContext<SdkworkInvoiceIntlValue>(
  DEFAULT_SDKWORK_INVOICE_INTL,
);

export function SdkworkInvoiceIntlProvider({
  children,
  locale,
  messages,
}: SdkworkInvoiceIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkInvoiceIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkInvoiceIntlContext.Provider value={value}>
      {children}
    </SdkworkInvoiceIntlContext.Provider>
  );
}

export function useSdkworkInvoiceIntl(): SdkworkInvoiceIntlValue {
  return useContext(SdkworkInvoiceIntlContext);
}

export function resolveSdkworkInvoiceStatusTone(
  status: SdkworkInvoiceStatus | string | null | undefined,
): "danger" | "neutral" | "success" | "warning" {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "completed") {
    return "success";
  }

  if (
    normalized === "draft"
    || normalized === "pending"
    || normalized === "processing"
  ) {
    return "warning";
  }

  if (normalized === "failed" || normalized === "cancelled") {
    return "danger";
  }

  return "neutral";
}
