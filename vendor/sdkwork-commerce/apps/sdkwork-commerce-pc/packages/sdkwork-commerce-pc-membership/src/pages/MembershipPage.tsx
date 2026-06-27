import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import {
  Button,
} from "@sdkwork/ui-pc-react/components/ui/button";
import {
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react/components/ui/feedback/states";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import type { SdkworkMembershipMessagesOverrides } from "../membership-copy";
import type { SdkworkMembershipController } from "../membership-controller";
import {
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
} from "../membership-controller";
import {
  createMembershipCheckoutRouteIntent,
  type SdkworkMembershipPurchaseMode,
} from "../membership.ts";
import {
  createSdkworkMembershipBackdropStyle,
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
} from "../membership-appearance";
import {
  SdkworkMembershipIntlProvider,
  useSdkworkMembershipIntl,
} from "../membership-intl";
import { SdkworkMembershipBenefitsGrid } from "../components/membership-benefits-grid";
import { SdkworkMembershipLevelComparison } from "../components/membership-level-comparison";
import { SdkworkMembershipMembershipHero } from "../components/membership-hero";

export interface SdkworkMembershipPageProps {
  checkoutBasePath?: string;
  controller?: SdkworkMembershipController;
  locale?: string | null;
  messages?: SdkworkMembershipMessagesOverrides;
  onNavigate?: (route: string) => void;
  purchaseFlow?: "checkout" | "direct";
}

interface SdkworkMembershipPageContentProps {
  checkoutBasePath?: string;
  controller?: SdkworkMembershipController;
  onNavigate?: (route: string) => void;
  purchaseFlow?: "checkout" | "direct";
}

function resolveMembershipPurchaseFlow(
  purchaseFlow: SdkworkMembershipPageProps["purchaseFlow"],
  onNavigate?: (route: string) => void,
): "checkout" | "direct" {
  if (purchaseFlow === "direct") {
    return "direct";
  }

  if (purchaseFlow === "checkout") {
    return "checkout";
  }

  return onNavigate ? "checkout" : "direct";
}

function SdkworkMembershipPageContent({
  checkoutBasePath,
  controller: controllerProp,
  onNavigate,
  purchaseFlow,
}: SdkworkMembershipPageContentProps) {
  const controller = useSdkworkMembershipController(controllerProp);
  const state = useSdkworkMembershipControllerState(controller);
  const {
    copy,
    formatDuration,
    formatIncludedPoints,
    formatPriceWas,
    locale,
  } = useSdkworkMembershipIntl();
  const selectedPlan = state.dashboard.plans.find((plan) => plan.packageId === state.selectedPlanId) ?? null;
  const resolvedPurchaseFlow = resolveMembershipPurchaseFlow(purchaseFlow, onNavigate);
  const orderedViews = [
    state.activeView,
    ...(["plans", "benefits", "levels"] as const).filter((view) => view !== state.activeView),
  ];

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  function navigateToMembershipCheckout(mode: SdkworkMembershipPurchaseMode) {
    if (!selectedPlan || !onNavigate || resolvedPurchaseFlow !== "checkout") {
      return false;
    }

    onNavigate(
      createMembershipCheckoutRouteIntent({
        basePath: checkoutBasePath,
        mode,
        plan: selectedPlan,
      }).route,
    );
    return true;
  }

  function renderPlansSection() {
    return (
      <section
        className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]"
        key="plans"
      >
        <div className="flex flex-col gap-4 border-b border-[var(--sdk-color-border-subtle)] px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.plans.eyebrow}</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.plans.title}</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["plans", "benefits", "levels"] as const).map((view) => (
              <Button
                key={view}
                onClick={() => controller.setView(view)}
                type="button"
                variant={state.activeView === view ? "secondary" : "ghost"}
              >
                {view === "plans"
                  ? copy.actions.plans
                  : view === "benefits"
                    ? copy.actions.benefits
                    : copy.actions.levels}
              </Button>
            ))}
            <Button onClick={() => void controller.refresh()} type="button" variant="outline">
              {copy.actions.refresh}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 lg:grid-cols-3">
          {state.dashboard.plans.length === 0 ? (
            <div className="col-span-full rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-center">
              <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.plans.emptyTitle}</div>
              <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">{copy.plans.emptyDescription}</div>
            </div>
          ) : state.dashboard.plans.map((plan) => {
            const isSelected = plan.packageId === state.selectedPlanId;
            const tone = isSelected ? "accent" : plan.recommended ? "brand" : "neutral";
            const originalPriceLabel = plan.originalPriceCny !== null && plan.originalPriceCny > plan.priceCny
              ? formatPriceWas(formatSdkworkCurrencyCny(plan.originalPriceCny, locale))
              : null;

            return (
              <article
                className="rounded-[1.5rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
                key={plan.id}
                style={createSdkworkMembershipPanelStyle(tone, {
                  backgroundWeight: isSelected ? 12 : 8,
                  borderWeight: isSelected ? 24 : 18,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{plan.name}</div>
                    <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                      {plan.description || copy.plans.descriptionFallback}
                    </div>
                  </div>

                  {plan.recommended ? (
                    <span
                      className="rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
                      style={createSdkworkMembershipToneStyle("accent", {
                        backgroundWeight: 10,
                        borderWeight: 18,
                      })}
                    >
                      {copy.plans.popular}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="text-4xl font-semibold text-[var(--sdk-color-text-primary)]">
                    {formatSdkworkCurrencyCny(plan.priceCny, locale)}
                  </div>
                  {originalPriceLabel ? (
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-muted)] line-through">
                      {originalPriceLabel}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3 rounded-[1.25rem] bg-[var(--sdk-color-surface-panel)] p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--sdk-color-text-muted)]">{copy.hero.remaining}</span>
                    <span className="font-medium text-[var(--sdk-color-text-primary)]">{formatDuration(plan.durationDays)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[var(--sdk-color-text-muted)]">{copy.hero.includedPoints}</span>
                    <span className="font-medium text-[var(--sdk-color-text-primary)]">{formatIncludedPoints(plan.includedPoints)}</span>
                  </div>
                </div>

                {plan.tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.tags.map((tag) => (
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-medium text-[var(--sdk-color-text-secondary)]"
                        key={tag}
                        style={createSdkworkMembershipToneStyle(tone, {
                          backgroundWeight: 8,
                          borderWeight: 14,
                        })}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <Button
                  className="mt-6 w-full"
                  onClick={() => controller.selectPlan(plan.packageId)}
                  type="button"
                  variant={isSelected ? "secondary" : "outline"}
                >
                  {isSelected ? copy.actions.selected : copy.actions.selectPlan}
                </Button>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderSection(view: "benefits" | "levels" | "plans") {
    if (view === "benefits") {
      return <SdkworkMembershipBenefitsGrid benefits={state.dashboard.benefits} key={view} />;
    }

    if (view === "levels") {
      return <SdkworkMembershipLevelComparison key={view} levels={state.dashboard.levels} />;
    }

    return renderPlansSection();
  }

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkMembershipBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-5">
          <SdkworkMembershipMembershipHero
            isMutating={state.isMutating}
            onPurchase={() => {
              if (navigateToMembershipCheckout("purchase")) {
                return;
              }

              void controller.purchaseSelectedPlan();
            }}
            onRenew={() => {
              if (navigateToMembershipCheckout("renew")) {
                return;
              }

              void controller.renewSelectedPlan();
            }}
            onUpgrade={() => {
              if (navigateToMembershipCheckout("upgrade")) {
                return;
              }

              void controller.upgradeSelectedPlan();
            }}
            selectedPlan={selectedPlan}
            summary={state.dashboard.summary}
          />

          <section className="grid gap-4 md:grid-cols-3">
            <div
              className="rounded-[1.35rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4"
              style={createSdkworkMembershipPanelStyle("accent", {
                backgroundWeight: 8,
                borderWeight: 18,
              })}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
                  style={createSdkworkMembershipToneStyle("accent", {
                    backgroundWeight: 12,
                    borderWeight: 22,
                  })}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--sdk-color-text-secondary)]">{copy.hero.selectedOffer}</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                    {selectedPlan?.name ?? copy.hero.noPackageSelected}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[1.35rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4"
              style={createSdkworkMembershipPanelStyle("success", {
                backgroundWeight: 8,
                borderWeight: 18,
              })}
            >
              <div className="text-sm font-medium text-[var(--sdk-color-text-secondary)]">{copy.hero.status}</div>
              <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                {copy.status[state.dashboard.summary.status]}
              </div>
            </div>

            <div
              className="rounded-[1.35rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4"
              style={createSdkworkMembershipPanelStyle("warning", {
                backgroundWeight: 8,
                borderWeight: 18,
              })}
            >
              <div className="text-sm font-medium text-[var(--sdk-color-text-secondary)]">{copy.hero.remaining}</div>
              <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                {formatDuration(state.dashboard.summary.remainingDays)}
              </div>
            </div>
          </section>

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          {orderedViews.map((view) => renderSection(view))}
        </div>
      </div>
    </div>
  );
}

export function SdkworkMembershipPage({
  locale,
  messages,
  ...props
}: SdkworkMembershipPageProps) {
  const content = <SdkworkMembershipPageContent {...props} />;

  if (locale || messages) {
    return (
      <SdkworkMembershipIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkMembershipIntlProvider>
    );
  }

  return content;
}
