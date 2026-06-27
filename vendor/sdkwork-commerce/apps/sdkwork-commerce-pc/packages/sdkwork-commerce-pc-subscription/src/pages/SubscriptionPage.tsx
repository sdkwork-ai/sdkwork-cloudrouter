import { useEffect } from "react";
import {
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type { SdkworkSubscriptionMessagesOverrides } from "../subscription-copy";
import type { SdkworkSubscriptionController } from "../subscription-controller";
import {
  useSdkworkSubscriptionController,
  useSdkworkSubscriptionControllerState,
} from "../subscription-controller";
import { createSdkworkSubscriptionBackdropStyle } from "../subscription-appearance";
import {
  SdkworkSubscriptionIntlProvider,
  useSdkworkSubscriptionIntl,
} from "../subscription-intl";
import type {
  SdkworkSubscriptionPurchaseResult,
  SdkworkSubscriptionService,
} from "../subscription-service";
import { SdkworkSubscriptionCheckoutPanel } from "../components/subscription-checkout-panel";
import { SdkworkSubscriptionHero } from "../components/subscription-hero";
import { SdkworkSubscriptionLevelGrid } from "../components/subscription-level-grid";
import { SdkworkSubscriptionPlanGrid } from "../components/subscription-plan-grid";
import { SdkworkSubscriptionStageShell } from "../components/subscription-stage-shell";

export interface SdkworkSubscriptionPageProps {
  controller?: SdkworkSubscriptionController;
  locale?: string | null;
  messages?: SdkworkSubscriptionMessagesOverrides;
  onCheckoutComplete?: (result: SdkworkSubscriptionPurchaseResult) => void;
  onCheckoutError?: (error: unknown) => void;
  service?: Partial<SdkworkSubscriptionService>;
}

interface SdkworkSubscriptionPageContentProps {
  controller?: SdkworkSubscriptionController;
  locale?: string | null;
  messages?: SdkworkSubscriptionMessagesOverrides;
  onCheckoutComplete?: (result: SdkworkSubscriptionPurchaseResult) => void;
  onCheckoutError?: (error: unknown) => void;
  service?: Partial<SdkworkSubscriptionService>;
}

function SdkworkSubscriptionPageContent({
  controller: controllerProp,
  locale,
  messages,
  onCheckoutComplete,
  onCheckoutError,
  service,
}: SdkworkSubscriptionPageContentProps) {
  const controller = useSdkworkSubscriptionController(controllerProp, {
    locale,
    messages,
    service,
  });
  const state = useSdkworkSubscriptionControllerState(controller);
  const { copy } = useSdkworkSubscriptionIntl();
  const selectedPlan = state.dashboard.plans.find((plan) => plan.packageId === state.selectedPackageId) ?? null;

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  function handleSubmit(): void {
    void controller.submitCheckout()
      .then((result) => {
        onCheckoutComplete?.(result);
      })
      .catch((error) => {
        onCheckoutError?.(error);
      });
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkSubscriptionBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-6">
          <SdkworkSubscriptionHero
            activeAction={state.activeAction}
            couponCount={state.dashboard.coupons.length}
            onActionChange={(action) => controller.setAction(action)}
            planCount={state.dashboard.plans.length}
            summary={state.dashboard.summary}
          />

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError && !state.isMutating ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <SdkworkSubscriptionStageShell
            activeAction={state.activeAction}
            activeStage={state.activeStage}
            checkout={state.checkout}
            couponCount={state.dashboard.coupons.length}
            isAuthenticated={state.dashboard.summary.isAuthenticated}
            onBackToPlans={() => controller.setStage("plans")}
            onContinueToCheckout={() => controller.setStage("checkout")}
            paymentContent={(
              <SdkworkSubscriptionCheckoutPanel
                activeAction={state.activeAction}
                checkout={state.checkout}
                coupons={state.dashboard.coupons}
                isAuthenticated={state.dashboard.summary.isAuthenticated}
                isMutating={state.isMutating}
                lastError={state.isMutating ? undefined : state.lastError}
                onClearCoupon={() => controller.clearCoupon()}
                onSelectCoupon={(couponId) => controller.selectCoupon(couponId)}
                onSelectPaymentMethod={(paymentMethodId) => controller.selectPaymentMethod(paymentMethodId)}
                onSubmit={handleSubmit}
                paymentMethods={state.dashboard.paymentMethods}
                selectedCouponId={state.selectedCouponId}
                selectedPlan={selectedPlan}
              />
            )}
            planContent={(
              <SdkworkSubscriptionPlanGrid
                benefits={state.dashboard.benefits}
                onSelectPlan={(packageId) => controller.selectPackage(packageId)}
                plans={state.dashboard.plans}
                selectedPackageId={state.selectedPackageId}
                summary={state.dashboard.summary}
              />
            )}
            planCount={state.dashboard.plans.length}
            selectedPlan={selectedPlan}
            summary={state.dashboard.summary}
          />

          <SdkworkSubscriptionLevelGrid levels={state.dashboard.levels} />
        </div>
      </div>
    </div>
  );
}

export function SdkworkSubscriptionPage({
  locale,
  messages,
  ...props
}: SdkworkSubscriptionPageProps) {
  const content = (
    <SdkworkSubscriptionPageContent
      {...props}
      locale={locale}
      messages={messages}
    />
  );

  if (locale || messages) {
    return (
      <SdkworkSubscriptionIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkSubscriptionIntlProvider>
    );
  }

  return content;
}
