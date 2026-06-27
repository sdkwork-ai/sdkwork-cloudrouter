import { useEffect } from "react";
import {
  CreditCard,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Button,
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import { resolveCheckoutRouteSourceId } from "../checkout";
import type { SdkworkCheckoutMessagesOverrides } from "../checkout-copy";
import type { SdkworkCheckoutController } from "../checkout-controller";
import {
  useSdkworkCheckoutController,
  useSdkworkCheckoutControllerState,
} from "../checkout-controller";
import {
  createSdkworkCheckoutBackdropStyle,
  createSdkworkCheckoutGlassStyle,
  createSdkworkCheckoutHeroStyle,
  createSdkworkCheckoutHeroTextStyle,
  createSdkworkCheckoutPanelStyle,
  createSdkworkCheckoutToneStyle,
} from "../checkout-appearance";
import {
  SdkworkCheckoutIntlProvider,
  useSdkworkCheckoutIntl,
} from "../checkout-intl";
import { SdkworkCheckoutPaymentMethods } from "../components/CheckoutPaymentMethods";
import { SdkworkCheckoutSummaryRail } from "../components/CheckoutSummaryRail";
import type { SdkworkCheckoutService } from "../checkout-service";

export interface SdkworkCheckoutPageProps {
  controller?: SdkworkCheckoutController;
  locale?: string | null;
  messages?: SdkworkCheckoutMessagesOverrides;
  onNavigate?: (route: string) => void;
  routeSearchParams?: URLSearchParams;
  service?: Partial<SdkworkCheckoutService>;
}

interface SdkworkCheckoutPageContentProps {
  controller?: SdkworkCheckoutController;
  onNavigate?: (route: string) => void;
  routeSearchParams?: URLSearchParams;
  service?: Partial<SdkworkCheckoutService>;
}

function SdkworkCheckoutPageContent({
  controller: controllerProp,
  onNavigate,
  routeSearchParams,
  service,
}: SdkworkCheckoutPageContentProps) {
  const {
    copy,
    formatCouponDeduction,
    formatCurrencyCny,
    formatInvoiceState,
    formatMinSpend,
    locale,
  } = useSdkworkCheckoutIntl();
  const controller = useSdkworkCheckoutController(controllerProp, service, {
    locale,
    messages: copy,
  });
  const state = useSdkworkCheckoutControllerState(controller);
  const heroHighlights = [
    {
      icon: CreditCard,
      label: copy.page.activeSourceLabel,
      tone: "brand" as const,
      value: state.session.source?.title || copy.page.activeSourceFallback,
    },
    {
      icon: ReceiptText,
      label: copy.page.invoicePostureLabel,
      tone: "success" as const,
      value: formatInvoiceState(state.session.summary.invoiceRequested),
    },
    {
      icon: ShieldCheck,
      label: copy.page.amountDueLabel,
      tone: "warning" as const,
      value: formatCurrencyCny(state.session.summary.payableAmountCny),
    },
  ];
  const primaryHeroTextStyle = createSdkworkCheckoutHeroTextStyle();
  const mutedHeroTextStyle = createSdkworkCheckoutHeroTextStyle("muted");
  const subtleHeroTextStyle = createSdkworkCheckoutHeroTextStyle("subtle");

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap().then(() => {
        controller.ensureRouteSource(routeSearchParams ?? new URLSearchParams());
        const sourceId = resolveCheckoutRouteSourceId(routeSearchParams ?? new URLSearchParams());
        if (sourceId) {
          controller.selectSource(sourceId);
        }
      });
      return;
    }

    if (state.isBootstrapped && routeSearchParams) {
      controller.ensureRouteSource(routeSearchParams);
      const sourceId = resolveCheckoutRouteSourceId(routeSearchParams);
      if (sourceId && state.selectedSourceId !== sourceId) {
        controller.selectSource(sourceId);
      }
    }
  }, [controller, routeSearchParams, state.isBootstrapped, state.isLoading, state.selectedSourceId]);

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={createSdkworkCheckoutBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-5">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(21rem,0.9fr)]">
            <div
              className="overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-6 py-7 text-white shadow-[var(--sdk-shadow-lg)]"
              style={createSdkworkCheckoutHeroStyle()}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] shadow-[var(--sdk-shadow-soft)]"
                    style={{
                      ...createSdkworkCheckoutGlassStyle("accent", {
                        backgroundWeight: 12,
                        borderWeight: 24,
                        surfaceWeight: 82,
                      }),
                      ...subtleHeroTextStyle,
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.page.eyebrow}
                  </div>
                  <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={primaryHeroTextStyle}>{copy.page.title}</h1>
                  <p className="mt-3 text-sm leading-7" style={mutedHeroTextStyle}>
                    {copy.page.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void controller.refresh()} type="button" variant="outline">
                    {copy.page.refresh}
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {heroHighlights.map((highlight) => {
                  const Icon = highlight.icon;

                  return (
                    <div
                      className="rounded-[1.4rem] border p-5 shadow-[var(--sdk-shadow-sm)] backdrop-blur-xl"
                      key={highlight.label}
                      style={createSdkworkCheckoutGlassStyle(highlight.tone, {
                        backgroundWeight: 12,
                        borderWeight: 26,
                      })}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm" style={mutedHeroTextStyle}>{highlight.label}</div>
                          <div className="mt-3 text-3xl font-semibold tracking-tight">
                            {highlight.value}
                          </div>
                        </div>
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                          style={createSdkworkCheckoutToneStyle(highlight.tone, {
                            backgroundWeight: 18,
                            borderWeight: 32,
                          })}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-[1.65rem] border p-5 shadow-[var(--sdk-shadow-md)]"
              style={createSdkworkCheckoutPanelStyle("neutral")}
            >
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
                {copy.page.sourceSectionEyebrow}
              </div>
              <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.page.sourceSectionTitle}</div>
              <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                {copy.page.sourceSectionDescription}
              </div>

              <div className="mt-5 space-y-3">
                {state.catalog.sources.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-5 text-sm text-[var(--sdk-color-text-secondary)]">
                    {copy.page.sourceSectionEmpty}
                  </div>
                ) : state.catalog.sources.map((source) => {
                  const isSelected = state.selectedSourceId === source.id;

                  return (
                    <button
                      className="w-full rounded-[1.35rem] border px-4 py-4 text-left transition-colors"
                      key={source.id}
                      onClick={() => controller.selectSource(source.id)}
                      style={isSelected
                        ? createSdkworkCheckoutPanelStyle("brand", {
                          backgroundWeight: 14,
                          borderWeight: 34,
                          surfaceColor: "var(--sdk-color-surface-panel-muted)",
                        })
                        : createSdkworkCheckoutPanelStyle("neutral", {
                          backgroundWeight: 8,
                          borderWeight: 24,
                          surfaceColor: "var(--sdk-color-surface-panel-muted)",
                        })}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{source.title}</div>
                          <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">{source.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                            {formatCurrencyCny(source.originalAmountCny)}
                          </div>
                          <div className="mt-1 text-xs text-[var(--sdk-color-text-muted)]">{source.billingLabel}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError && !state.isMutating ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
            <div className="space-y-5">
              <SdkworkCheckoutPaymentMethods
                methods={state.catalog.paymentMethods}
                onSelectPaymentMethod={(paymentMethodId) => controller.selectPaymentMethod(paymentMethodId)}
                selectedPaymentMethodId={state.selectedPaymentMethodId ?? null}
              />

              <section
                className="rounded-[1.65rem] border p-5 shadow-[var(--sdk-shadow-md)]"
                style={createSdkworkCheckoutPanelStyle("neutral")}
              >
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
                  {copy.page.couponSectionEyebrow}
                </div>
                <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.page.couponSectionTitle}</div>
                <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                  {copy.page.couponDescription}
                </div>

                <div className="mt-5 space-y-3">
                  {state.session.availableCoupons.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-5 text-sm text-[var(--sdk-color-text-secondary)]">
                      {copy.page.couponEmpty}
                    </div>
                  ) : state.session.availableCoupons.map((coupon) => {
                    const isSelected = state.selectedCouponId === coupon.id;

                    return (
                      <button
                        className="w-full rounded-[1.3rem] border px-4 py-4 text-left transition-colors"
                        key={coupon.id}
                        onClick={() => controller.selectCoupon(isSelected ? null : coupon.id)}
                        style={isSelected
                          ? createSdkworkCheckoutPanelStyle("accent", {
                            backgroundWeight: 14,
                            borderWeight: 34,
                            surfaceColor: "var(--sdk-color-surface-panel-muted)",
                          })
                          : createSdkworkCheckoutPanelStyle("neutral", {
                            backgroundWeight: 8,
                            borderWeight: 24,
                            surfaceColor: "var(--sdk-color-surface-panel-muted)",
                          })}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{coupon.label}</div>
                            <div className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
                              {formatMinSpend(coupon.minimumSpendCny)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-rose-500">
                            {formatCouponDeduction(coupon.discountAmountCny)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <SdkworkCheckoutSummaryRail
              invoiceRequested={Boolean(state.invoiceRequested)}
              isAuthenticated={state.catalog.isAuthenticated}
              isMutating={state.isMutating}
              lastError={state.isMutating ? undefined : state.lastError}
              onSubmit={() => {
                void controller.submitCheckout().then((result) => {
                  if (result.status !== "failed" && result.nextRoute) {
                    onNavigate?.(result.nextRoute);
                  }
                });
              }}
              onToggleInvoiceRequested={(requested) => controller.toggleInvoiceRequested(requested)}
              source={state.session.source}
              summary={state.session.summary}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SdkworkCheckoutPage({
  locale,
  messages,
  ...props
}: SdkworkCheckoutPageProps) {
  const content = <SdkworkCheckoutPageContent {...props} />;

  if (locale || messages) {
    return (
      <SdkworkCheckoutIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkCheckoutIntlProvider>
    );
  }

  return content;
}
