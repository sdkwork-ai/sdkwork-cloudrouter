import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import {
  createSdkworkCheckoutMessages,
  normalizeSdkworkCheckoutLocale,
  type SdkworkCheckoutMessages,
  type SdkworkCheckoutMessagesOverrides,
} from "./checkout-copy";
type SdkworkCheckoutMessageFilter = keyof SdkworkCheckoutMessages["filters"];

export interface SdkworkCheckoutIntlValue {
  copy: SdkworkCheckoutMessages;
  formatCouponDeduction: (value: number | null | undefined) => string;
  formatCurrencyCny: (value: number | null | undefined) => string;
  formatFilterLabel: (filter: SdkworkCheckoutMessageFilter) => string;
  formatInvoiceState: (requested: boolean) => string;
  formatMinSpend: (value: number | null | undefined) => string;
  locale: string;
}

export interface SdkworkCheckoutIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkCheckoutMessagesOverrides;
}

function interpolateSdkworkCheckoutTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, value),
    template,
  );
}

function createSdkworkCheckoutIntlValue(
  locale?: string | null,
  overrides?: SdkworkCheckoutMessagesOverrides,
): SdkworkCheckoutIntlValue {
  const resolvedLocale = normalizeSdkworkCheckoutLocale(locale);
  const copy = createSdkworkCheckoutMessages(resolvedLocale, overrides);

  return {
    copy,
    formatCouponDeduction(value) {
      return interpolateSdkworkCheckoutTemplate(copy.format.couponDeductionValue, {
        value: formatSdkworkCurrencyCny(value, resolvedLocale),
      });
    },
    formatCurrencyCny(value) {
      return formatSdkworkCurrencyCny(value, resolvedLocale);
    },
    formatFilterLabel(filter) {
      return copy.filters[filter];
    },
    formatInvoiceState(requested) {
      return requested ? copy.format.invoiceStateRequested : copy.format.invoiceStateDisabled;
    },
    formatMinSpend(value) {
      if (!value) {
        return copy.format.noMinimumSpend;
      }

      return interpolateSdkworkCheckoutTemplate(copy.format.minSpendValue, {
        value: formatSdkworkCurrencyCny(value, resolvedLocale),
      });
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_CHECKOUT_INTL = createSdkworkCheckoutIntlValue();

const SdkworkCheckoutIntlContext = createContext<SdkworkCheckoutIntlValue>(
  DEFAULT_SDKWORK_CHECKOUT_INTL,
);

export function SdkworkCheckoutIntlProvider({
  children,
  locale,
  messages,
}: SdkworkCheckoutIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkCheckoutIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkCheckoutIntlContext.Provider value={value}>
      {children}
    </SdkworkCheckoutIntlContext.Provider>
  );
}

export function useSdkworkCheckoutIntl(): SdkworkCheckoutIntlValue {
  return useContext(SdkworkCheckoutIntlContext);
}
