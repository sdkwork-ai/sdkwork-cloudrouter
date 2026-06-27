import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny,
  formatSdkworkCommercePoints as formatSdkworkPoints,
} from "@sdkwork/commerce-service";
import {
  createSdkworkCommerceMessages,
  formatSdkworkCommerceTemplate,
  normalizeSdkworkCommerceLocale,
  type SdkworkCommerceMessages,
  type SdkworkCommerceMessagesOverrides,
} from "./commerce-copy";

export interface SdkworkCommerceIntlValue {
  copy: SdkworkCommerceMessages;
  formatAccountState: (isAuthenticated: boolean) => string;
  formatActionRequired: (value: number) => string;
  formatClaimableExpiring: (claimable: number, expiring: number) => string;
  formatCurrency: (value: number | null | undefined) => string;
  formatDate: (value: string) => string;
  formatIncludesPoints: (value: number) => string;
  formatOrderCount: (value: number) => string;
  formatOrdersAov: (orders: number, averageOrderValueCny: number) => string;
  formatPendingIssuance: (value: number) => string;
  formatPoints: (value: number) => string;
  formatSavings: (value: number | null | undefined) => string;
  formatShare: (value: number) => string;
  formatTrackedOrders: (value: number) => string;
  formatTrend: (value: number) => string;
  formatMembershipTerm: (value: number | null) => string;
  locale: string;
}

export interface SdkworkCommerceIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkCommerceMessagesOverrides;
}

function createSdkworkCommerceIntlValue(
  locale?: string | null,
  overrides?: SdkworkCommerceMessagesOverrides,
): SdkworkCommerceIntlValue {
  const resolvedLocale = normalizeSdkworkCommerceLocale(locale);
  const copy = createSdkworkCommerceMessages(resolvedLocale, overrides);

  return {
    copy,
    formatAccountState(isAuthenticated) {
      return isAuthenticated ? copy.common.authenticated : copy.common.guest;
    },
    formatActionRequired(value) {
      return formatSdkworkCommerceTemplate(copy.common.actionRequiredValue, {
        value: String(value),
      });
    },
    formatClaimableExpiring(claimable, expiring) {
      return formatSdkworkCommerceTemplate(copy.common.claimableExpiringValue, {
        claimable: String(claimable),
        expiring: String(expiring),
      });
    },
    formatCurrency(value) {
      return formatSdkworkCurrencyCny(value, resolvedLocale);
    },
    formatDate(value) {
      const timestamp = new Date(value);
      if (Number.isNaN(timestamp.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat(resolvedLocale, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }).format(timestamp);
    },
    formatIncludesPoints(value) {
      return formatSdkworkCommerceTemplate(copy.common.includesPointsValue, {
        value: formatSdkworkPoints(value, resolvedLocale),
      });
    },
    formatOrderCount(value) {
      return formatSdkworkCommerceTemplate(copy.common.orderCountValue, {
        value: String(value),
      });
    },
    formatOrdersAov(orders, averageOrderValueCny) {
      return formatSdkworkCommerceTemplate(copy.common.ordersAovValue, {
        orders: String(orders),
        value: formatSdkworkCurrencyCny(averageOrderValueCny, resolvedLocale),
      });
    },
    formatPendingIssuance(value) {
      return formatSdkworkCommerceTemplate(copy.common.pendingIssuanceValue, {
        value: String(value),
      });
    },
    formatPoints(value) {
      return formatSdkworkPoints(value, resolvedLocale);
    },
    formatSavings(value) {
      return formatSdkworkCommerceTemplate(copy.common.savingsValue, {
        value: formatSdkworkCurrencyCny(value, resolvedLocale),
      });
    },
    formatShare(value) {
      return formatSdkworkCommerceTemplate(copy.common.shareValue, {
        value: String(value),
      });
    },
    formatTrackedOrders(value) {
      return formatSdkworkCommerceTemplate(copy.analyticsSummary.totalRevenueRecordsValue, {
        value: String(value),
      });
    },
    formatTrend(value) {
      return formatSdkworkCommerceTemplate(copy.common.trendValue, {
        value: `${value >= 0 ? "+" : ""}${value}`,
      });
    },
    formatMembershipTerm(value) {
      if (value === null) {
        return copy.common.noActiveTerm;
      }

      return formatSdkworkCommerceTemplate(copy.common.daysValue, {
        value: String(value),
      });
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_COMMERCE_INTL = createSdkworkCommerceIntlValue();

const SdkworkCommerceIntlContext = createContext<SdkworkCommerceIntlValue>(
  DEFAULT_SDKWORK_COMMERCE_INTL,
);

export function SdkworkCommerceIntlProvider({
  children,
  locale,
  messages,
}: SdkworkCommerceIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkCommerceIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkCommerceIntlContext.Provider value={value}>
      {children}
    </SdkworkCommerceIntlContext.Provider>
  );
}

export function useSdkworkCommerceIntl(): SdkworkCommerceIntlValue {
  return useContext(SdkworkCommerceIntlContext);
}
