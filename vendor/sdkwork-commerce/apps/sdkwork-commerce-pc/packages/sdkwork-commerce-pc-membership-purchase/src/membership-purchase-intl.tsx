import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  createSdkworkMembershipPurchaseMessages,
  formatSdkworkMembershipPurchasePaymentMethod,
  normalizeSdkworkMembershipPurchaseLocale,
  type SdkworkMembershipPurchaseMessages,
  type SdkworkMembershipPurchaseMessagesOverrides,
} from "./membership-purchase-copy";

export interface SdkworkMembershipPurchaseIntlValue {
  copy: SdkworkMembershipPurchaseMessages;
  formatPaymentMethod: (method: "ALIPAY" | "WECHAT") => string;
  locale: string;
}

export interface SdkworkMembershipPurchaseIntlProviderProps extends PropsWithChildren {
  locale?: string | null;
  messages?: SdkworkMembershipPurchaseMessagesOverrides;
}

function createSdkworkMembershipPurchaseIntlValue(
  locale?: string | null,
  overrides?: SdkworkMembershipPurchaseMessagesOverrides,
): SdkworkMembershipPurchaseIntlValue {
  const resolvedLocale = normalizeSdkworkMembershipPurchaseLocale(locale);
  const copy = createSdkworkMembershipPurchaseMessages(resolvedLocale, overrides);

  return {
    copy,
    formatPaymentMethod(method) {
      return formatSdkworkMembershipPurchasePaymentMethod(method, resolvedLocale, overrides);
    },
    locale: resolvedLocale,
  };
}

const DEFAULT_SDKWORK_MEMBERSHIP_PURCHASE_INTL = createSdkworkMembershipPurchaseIntlValue();
const SdkworkMembershipPurchaseIntlContext = createContext<SdkworkMembershipPurchaseIntlValue>(
  DEFAULT_SDKWORK_MEMBERSHIP_PURCHASE_INTL,
);

export function SdkworkMembershipPurchaseIntlProvider({
  children,
  locale,
  messages,
}: SdkworkMembershipPurchaseIntlProviderProps) {
  const value = useMemo(
    () => createSdkworkMembershipPurchaseIntlValue(locale, messages),
    [locale, messages],
  );

  return (
    <SdkworkMembershipPurchaseIntlContext.Provider value={value}>
      {children}
    </SdkworkMembershipPurchaseIntlContext.Provider>
  );
}

export function useSdkworkMembershipPurchaseIntl(): SdkworkMembershipPurchaseIntlValue {
  return useContext(SdkworkMembershipPurchaseIntlContext);
}
