import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type {
  SdkworkBillingAlert,
  SdkworkBillingBreakdownKey,
  SdkworkBillingPosture,
  SdkworkBillingRecommendedAction,
} from "./billing";
import {
  createSdkworkBillingMessages,
  formatSdkworkBillingActivePackages,
  formatSdkworkBillingAvailablePoints,
  formatSdkworkBillingBreakdownLabel,
  formatSdkworkBillingPlanPosture,
  formatSdkworkBillingPostureLabel,
  formatSdkworkBillingTopActionLabel,
  normalizeSdkworkBillingLocale,
  type SdkworkBillingMessages,
  type SdkworkBillingMessagesOverrides,
} from "./billing-copy";

interface SdkworkBillingResolvedAlert {
  actionLabel?: string;
  description: string;
  severityLabel: string;
  title: string;
  value?: string;
}

export interface SdkworkBillingIntlValue {
  copy: SdkworkBillingMessages;
  formatActivePackages: (value: number) => string;
  formatAlert: (alert: Pick<SdkworkBillingAlert, "action" | "description" | "id" | "severity" | "title" | "value">) => SdkworkBillingResolvedAlert;
  formatAvailablePoints: (value: number) => string;
  formatBreakdownKind: (kind: SdkworkBillingBreakdownKey) => string;
  formatPaymentMethod: (value: string | null | undefined) => string;
  formatPlanPosture: (value: string) => string;
  formatPosture: (posture: SdkworkBillingPosture) => string;
  formatStatus: (status: string | undefined, fallback?: string) => string;
  formatTimestamp: (value: string) => string;
  formatTopActionLabel: (action: Pick<SdkworkBillingRecommendedAction, "label" | "reason">) => string;
  locale: string;
}

export interface SdkworkBillingIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
}

function normalizePaymentMethodKey(
  value: string | null | undefined,
): keyof SdkworkBillingMessages["paymentMethod"] {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "ALIPAY") {
    return "ALIPAY";
  }

  if (normalized === "WECHAT_PAY" || normalized === "WECHAT") {
    return "WECHAT";
  }

  if (
    normalized === "BANKCARD"
    || normalized === "BANK_CARD"
    || normalized === "CARD"
  ) {
    return "BANKCARD";
  }

  return "UNKNOWN";
}

function normalizeStatusKey(
  value: string | undefined,
): keyof SdkworkBillingMessages["status"] | null {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "draft") {
    return "draft";
  }

  if (normalized === "pending") {
    return "pending";
  }

  if (normalized === "processing") {
    return "processing";
  }

  if (normalized === "submitted") {
    return "submitted";
  }

  if (normalized === "success" || normalized === "completed") {
    return "completed";
  }

  if (normalized === "failed") {
    return "failed";
  }

  if (normalized === "paid") {
    return "paid";
  }

  if (normalized === "default") {
    return "default";
  }

  if (normalized === "unpaid") {
    return "unpaid";
  }

  return null;
}

function resolveAlertCopy(
  copy: SdkworkBillingMessages,
  alertId: string,
): SdkworkBillingMessages["alerts"][keyof SdkworkBillingMessages["alerts"]] | null {
  if (alertId === "payment-attention") {
    return copy.alerts.paymentAttention;
  }

  if (alertId === "projected-budget-overrun") {
    return copy.alerts.projectedBudgetOverrun;
  }

  if (alertId === "budget-watch") {
    return copy.alerts.budgetWatch;
  }

  if (alertId === "invoice-attention") {
    return copy.alerts.invoiceAttention;
  }

  return null;
}

function createSdkworkBillingIntlValue(
  locale?: string | null,
  overrides?: SdkworkBillingMessagesOverrides,
): SdkworkBillingIntlValue {
  const resolvedLocale = normalizeSdkworkBillingLocale(locale);
  const copy = createSdkworkBillingMessages(resolvedLocale, overrides);

  return {
    copy,
    formatActivePackages(value) {
      return formatSdkworkBillingActivePackages(value, resolvedLocale, overrides);
    },
    formatAlert(alert) {
      const localized = resolveAlertCopy(copy, alert.id);

      return {
        actionLabel: localized?.action ?? alert.action?.label,
        description: localized?.description ?? alert.description,
        severityLabel:
          alert.severity === "critical"
            ? copy.severity.critical
            : alert.severity === "warning"
              ? copy.severity.warning
              : copy.severity.info,
        title: localized?.title ?? alert.title,
        value: alert.value,
      };
    },
    formatAvailablePoints(value) {
      return formatSdkworkBillingAvailablePoints(value, resolvedLocale, overrides);
    },
    formatBreakdownKind(kind) {
      return formatSdkworkBillingBreakdownLabel(kind, resolvedLocale, overrides);
    },
    formatPaymentMethod(value) {
      return copy.paymentMethod[normalizePaymentMethodKey(value)];
    },
    formatPlanPosture(value) {
      return formatSdkworkBillingPlanPosture(value, resolvedLocale, overrides);
    },
    formatPosture(posture) {
      return formatSdkworkBillingPostureLabel(posture, resolvedLocale, overrides);
    },
    formatStatus(status, fallback) {
      const key = normalizeStatusKey(status);
      return key ? copy.status[key] : fallback || String(status || "").trim();
    },
    formatTimestamp(value) {
      const timestamp = new Date(value);

      if (Number.isNaN(timestamp.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(timestamp);
    },
    formatTopActionLabel(action) {
      return formatSdkworkBillingTopActionLabel(action, resolvedLocale, overrides);
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_BILLING_INTL = createSdkworkBillingIntlValue();

const SdkworkBillingIntlContext = createContext<SdkworkBillingIntlValue>(
  DEFAULT_SDKWORK_BILLING_INTL,
);

export function SdkworkBillingIntlProvider({
  children,
  locale,
  messages,
}: SdkworkBillingIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkBillingIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkBillingIntlContext.Provider value={value}>
      {children}
    </SdkworkBillingIntlContext.Provider>
  );
}

export function useSdkworkBillingIntl(): SdkworkBillingIntlValue {
  return useContext(SdkworkBillingIntlContext);
}
