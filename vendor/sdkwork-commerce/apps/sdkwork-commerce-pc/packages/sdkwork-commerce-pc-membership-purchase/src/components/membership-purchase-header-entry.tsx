import {
  Suspense,
  useEffect,
  useState,
} from "react";
import { Crown } from "lucide-react";
import {
  createSdkworkMembershipToneStyle,
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
  type SdkworkMembershipController,
} from "@sdkwork/commerce-pc-membership";
import type { SdkworkMembershipPurchaseMessagesOverrides } from "../membership-purchase-copy";
import {
  SdkworkMembershipPurchaseIntlProvider,
  useSdkworkMembershipPurchaseIntl,
} from "../membership-purchase-intl";
import type { SdkworkMembershipPurchaseService } from "../membership-purchase-service";
import { SdkworkMembershipPurchaseMenu } from "./membership-purchase-menu";

export interface SdkworkMembershipPurchaseHeaderEntryProps {
  checkoutBasePath?: string;
  controller?: SdkworkMembershipController;
  locale?: string | null;
  messages?: SdkworkMembershipPurchaseMessagesOverrides;
  onNavigate?: (route: string) => void;
  onOpenCenter?: () => void;
  purchaseFlow?: "checkout" | "direct";
  purchaseService?: Pick<SdkworkMembershipPurchaseService, "submitPackagePurchase">;
}

function SdkworkMembershipPurchaseHeaderEntryContent({
  checkoutBasePath,
  controller: controllerProp,
  onNavigate,
  onOpenCenter,
  purchaseFlow,
  purchaseService,
}: Omit<SdkworkMembershipPurchaseHeaderEntryProps, "locale" | "messages">) {
  const controller = useSdkworkMembershipController(controllerProp);
  const state = useSdkworkMembershipControllerState(controller);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { copy } = useSdkworkMembershipPurchaseIntl();
  const label = state.dashboard.summary.isAuthenticated && state.dashboard.summary.currentLevelName
    ? state.dashboard.summary.currentLevelName
    : copy.header.title;

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  return (
    <div className="relative flex items-center">
      <button
        aria-label={copy.header.ariaLabel}
        className="inline-flex h-9 items-center gap-2 rounded-[1rem] border px-3 text-sm font-medium"
        onClick={() => setIsMenuOpen((current) => !current)}
        style={createSdkworkMembershipToneStyle("accent", {
          backgroundWeight: 12,
          borderWeight: 24,
        })}
        type="button"
      >
        <Crown className="h-4 w-4" />
        {label}
      </button>

      {isMenuOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50">
          <Suspense fallback={null}>
            <SdkworkMembershipPurchaseMenu
              checkoutBasePath={checkoutBasePath}
              controller={controller}
              onNavigate={onNavigate}
              onOpenCenter={onOpenCenter
                ? () => {
                  setIsMenuOpen(false);
                  onOpenCenter();
                }
                : undefined}
              onPurchased={() => {
                setIsMenuOpen(false);
              }}
              purchaseFlow={purchaseFlow}
              purchaseService={purchaseService}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

export function SdkworkMembershipPurchaseHeaderEntry({
  locale,
  messages,
  ...props
}: SdkworkMembershipPurchaseHeaderEntryProps) {
  const content = <SdkworkMembershipPurchaseHeaderEntryContent {...props} />;

  if (locale || messages) {
    return (
      <SdkworkMembershipPurchaseIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkMembershipPurchaseIntlProvider>
    );
  }

  return content;
}
