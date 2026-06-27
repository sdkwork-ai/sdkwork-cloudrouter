import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  createSdkworkMembershipMessages,
  formatSdkworkMembershipDurationLabel,
  formatSdkworkMembershipIncludedPointsLabel,
  formatSdkworkMembershipPriceWasLabel,
  formatSdkworkMembershipStatusLabel,
  formatSdkworkMembershipUsageLabel,
  normalizeSdkworkMembershipLocale,
  type SdkworkMembershipMessages,
  type SdkworkMembershipMessagesOverrides,
} from "./membership-copy";

export interface SdkworkMembershipIntlValue {
  copy: SdkworkMembershipMessages;
  formatDuration: (value: number | null) => string;
  formatIncludedPoints: (value: number) => string;
  formatPriceWas: (value: string) => string;
  formatStatus: (value: "active" | "free" | "guest") => string;
  formatUsage: (used: number | null, limit: number | null) => string;
  locale: string;
}

export interface SdkworkMembershipIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkMembershipMessagesOverrides;
}

function createSdkworkMembershipIntlValue(
  locale?: string | null,
  overrides?: SdkworkMembershipMessagesOverrides,
): SdkworkMembershipIntlValue {
  const resolvedLocale = normalizeSdkworkMembershipLocale(locale);
  const copy = createSdkworkMembershipMessages(resolvedLocale, overrides);

  return {
    copy,
    formatDuration(value) {
      return formatSdkworkMembershipDurationLabel(value, resolvedLocale, overrides);
    },
    formatIncludedPoints(value) {
      return formatSdkworkMembershipIncludedPointsLabel(value, resolvedLocale);
    },
    formatPriceWas(value) {
      return formatSdkworkMembershipPriceWasLabel(value, resolvedLocale, overrides);
    },
    formatStatus(value) {
      return formatSdkworkMembershipStatusLabel(value, resolvedLocale, overrides);
    },
    formatUsage(used, limit) {
      return formatSdkworkMembershipUsageLabel(used, limit, resolvedLocale, overrides);
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_MEMBERSHIP_INTL = createSdkworkMembershipIntlValue();

const SdkworkMembershipIntlContext = createContext<SdkworkMembershipIntlValue>(
  DEFAULT_SDKWORK_MEMBERSHIP_INTL,
);

export function SdkworkMembershipIntlProvider({
  children,
  locale,
  messages,
}: SdkworkMembershipIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkMembershipIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkMembershipIntlContext.Provider value={value}>
      {children}
    </SdkworkMembershipIntlContext.Provider>
  );
}

export function useSdkworkMembershipIntl(): SdkworkMembershipIntlValue {
  return useContext(SdkworkMembershipIntlContext);
}
