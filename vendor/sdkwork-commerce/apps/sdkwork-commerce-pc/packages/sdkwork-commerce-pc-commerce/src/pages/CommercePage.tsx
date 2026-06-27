import { useEffect, useMemo } from "react";
import {
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import {
  createSdkworkCommerceBackdropStyle,
} from "../commerce-appearance";
import type { SdkworkCommerceMessagesOverrides } from "../commerce-copy";
import type { SdkworkCommerceController } from "../commerce-controller";
import {
  useSdkworkCommerceController,
  useSdkworkCommerceControllerState,
} from "../commerce-controller";
import {
  SdkworkCommerceIntlProvider,
  useSdkworkCommerceIntl,
} from "../commerce-intl";
import type { SdkworkCommerceHubService } from "../commerce-service";
import { SdkworkCommerceAnalyticsSummaryPanel } from "../components/commerce-analytics-summary";
import { SdkworkCommerceAnalyticsWorkbench } from "../components/commerce-analytics-workbench";
import { SdkworkCommerceActivityGrid } from "../components/commerce-activity-grid";
import { SdkworkCommerceFeaturedOffersPanel } from "../components/commerce-featured-offers-panel";
import { SdkworkCommerceHeroPanel } from "../components/commerce-hero-panel";
import { SdkworkCommerceRevenuePanel } from "../components/commerce-revenue-panel";

export interface SdkworkCommercePageProps {
  controller?: SdkworkCommerceController;
  locale?: string | null;
  messages?: SdkworkCommerceMessagesOverrides;
  service?: Partial<SdkworkCommerceHubService>;
}

interface SdkworkCommercePageContentProps {
  controller?: SdkworkCommerceController;
  locale?: string | null;
  messages?: SdkworkCommerceMessagesOverrides;
  service?: Partial<SdkworkCommerceHubService>;
}

function SdkworkCommercePageContent({
  controller: controllerProp,
  locale,
  messages,
  service,
}: SdkworkCommercePageContentProps) {
  const controllerOptions = useMemo(
    () => ({
      locale,
      messages,
      service,
    }),
    [locale, messages, service],
  );
  const controller = useSdkworkCommerceController(controllerProp, controllerOptions);
  const state = useSdkworkCommerceControllerState(controller);
  const { copy } = useSdkworkCommerceIntl();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkCommerceBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-5">
          <SdkworkCommerceHeroPanel summary={state.snapshot.summary} />

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <SdkworkCommerceAnalyticsSummaryPanel summary={state.snapshot.analyticsSummary} />
          <SdkworkCommerceRevenuePanel
            productPerformance={state.snapshot.productPerformance}
            revenueTrend={state.snapshot.revenueTrend}
          />
          <SdkworkCommerceAnalyticsWorkbench
            alerts={state.snapshot.alerts}
            productPerformance={state.snapshot.productPerformance}
            recentRevenueRecords={state.snapshot.recentRevenueRecords}
          />
          <SdkworkCommerceFeaturedOffersPanel featuredOffers={state.snapshot.featuredOffers} />
          <SdkworkCommerceActivityGrid snapshot={state.snapshot} />
        </div>
      </div>
    </div>
  );
}

export function SdkworkCommercePage({
  locale,
  messages,
  ...props
}: SdkworkCommercePageProps) {
  const content = (
    <SdkworkCommercePageContent
      {...props}
      locale={locale}
      messages={messages}
    />
  );

  if (locale || messages) {
    return (
      <SdkworkCommerceIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkCommerceIntlProvider>
    );
  }

  return content;
}
