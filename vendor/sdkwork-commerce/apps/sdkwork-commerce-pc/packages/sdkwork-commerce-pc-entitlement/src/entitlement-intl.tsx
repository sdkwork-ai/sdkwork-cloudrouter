import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type {
  SdkworkEntitlementFilter,
  SdkworkEntitlementStatus,
} from "./entitlement";
import {
  createSdkworkEntitlementMessages,
  normalizeSdkworkEntitlementLocale,
  type SdkworkEntitlementMessages,
  type SdkworkEntitlementMessagesOverrides,
} from "./entitlement-copy";

export interface SdkworkEntitlementIntlValue {
  copy: SdkworkEntitlementMessages;
  formatFilter: (filter: SdkworkEntitlementFilter) => string;
  formatStatus: (status: SdkworkEntitlementStatus | string | null | undefined) => string;
  locale: string;
}

export interface SdkworkEntitlementIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
}

function normalizeStatusKey(
  status: SdkworkEntitlementStatus | string | null | undefined,
): keyof SdkworkEntitlementMessages["status"] {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "ready") {
    return "ready";
  }

  if (normalized === "limited") {
    return "limited";
  }

  if (normalized === "locked") {
    return "locked";
  }

  if (normalized === "recharge-required") {
    return "rechargeRequired";
  }

  return "upgradeRequired";
}

function normalizeFilterKey(
  filter: SdkworkEntitlementFilter,
): keyof SdkworkEntitlementMessages["filters"] {
  const normalized = String(filter).trim().toLowerCase();

  if (normalized === "all") {
    return "all";
  }

  if (normalized === "attention") {
    return "attention";
  }

  if (normalized === "ready") {
    return "ready";
  }

  if (normalized === "limited") {
    return "limited";
  }

  if (normalized === "locked") {
    return "locked";
  }

  if (normalized === "recharge-required") {
    return "rechargeRequired";
  }

  return "upgradeRequired";
}

function createSdkworkEntitlementIntlValue(
  locale?: string | null,
  overrides?: SdkworkEntitlementMessagesOverrides,
): SdkworkEntitlementIntlValue {
  const resolvedLocale = normalizeSdkworkEntitlementLocale(locale);
  const copy = createSdkworkEntitlementMessages(resolvedLocale, overrides);

  return {
    copy,
    formatFilter(filter) {
      return copy.filters[normalizeFilterKey(filter)];
    },
    formatStatus(status) {
      return copy.status[normalizeStatusKey(status)];
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_ENTITLEMENT_INTL = createSdkworkEntitlementIntlValue();

const SdkworkEntitlementIntlContext = createContext<SdkworkEntitlementIntlValue>(
  DEFAULT_SDKWORK_ENTITLEMENT_INTL,
);

export function SdkworkEntitlementIntlProvider({
  children,
  locale,
  messages,
}: SdkworkEntitlementIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkEntitlementIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkEntitlementIntlContext.Provider value={value}>
      {children}
    </SdkworkEntitlementIntlContext.Provider>
  );
}

export function useSdkworkEntitlementIntl(): SdkworkEntitlementIntlValue {
  return useContext(SdkworkEntitlementIntlContext);
}

export function resolveSdkworkEntitlementStatusTone(
  status: SdkworkEntitlementStatus | string | null | undefined,
): "danger" | "neutral" | "success" | "warning" {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "ready") {
    return "success";
  }

  if (normalized === "limited") {
    return "warning";
  }

  if (
    normalized === "locked"
    || normalized === "upgrade-required"
    || normalized === "recharge-required"
  ) {
    return "danger";
  }

  return "neutral";
}
