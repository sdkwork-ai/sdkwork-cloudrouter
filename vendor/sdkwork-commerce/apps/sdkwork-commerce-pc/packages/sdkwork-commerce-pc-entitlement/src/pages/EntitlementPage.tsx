import { useEffect } from "react";
import {
  ArrowRight,
  Crown,
  Gauge,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  Button,
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type { SdkworkEntitlementFilter } from "../entitlement";
import type { SdkworkEntitlementMessagesOverrides } from "../entitlement-copy";
import type { SdkworkEntitlementController } from "../entitlement-controller";
import {
  useSdkworkEntitlementController,
  useSdkworkEntitlementControllerState,
} from "../entitlement-controller";
import type { SdkworkEntitlementService } from "../entitlement-service";
import {
  createSdkworkEntitlementBackdropStyle,
  createSdkworkEntitlementGlassStyle,
  createSdkworkEntitlementHeroStyle,
  createSdkworkEntitlementHeroTextStyle,
  createSdkworkEntitlementPanelStyle,
  createSdkworkEntitlementToneStyle,
} from "../entitlement-appearance";
import {
  resolveSdkworkEntitlementStatusTone,
  SdkworkEntitlementIntlProvider,
  useSdkworkEntitlementIntl,
} from "../entitlement-intl";

export interface SdkworkEntitlementPageProps {
  controller?: SdkworkEntitlementController;
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
  onNavigate?: (route: string) => void;
  service?: Partial<SdkworkEntitlementService>;
}

const FILTERS: SdkworkEntitlementFilter[] = [
  "all",
  "attention",
  "ready",
  "limited",
  "upgrade-required",
  "recharge-required",
  "locked",
];

interface SdkworkEntitlementPageContentProps {
  controller?: SdkworkEntitlementController;
  locale?: string | null;
  messages?: SdkworkEntitlementMessagesOverrides;
  onNavigate?: (route: string) => void;
  service?: Partial<SdkworkEntitlementService>;
}

function SdkworkEntitlementPageContent({
  controller: controllerProp,
  locale,
  messages,
  onNavigate,
  service,
}: SdkworkEntitlementPageContentProps) {
  const controller = useSdkworkEntitlementController(controllerProp, {
    locale,
    messages,
    service,
  });
  const state = useSdkworkEntitlementControllerState(controller);
  const selectedDecision = state.selectedCapability;
  const { copy, formatFilter, formatStatus } = useSdkworkEntitlementIntl();
  const heroHighlights = [
    {
      icon: Gauge,
      label: copy.cards.attentionCapabilities,
      tone: "danger" as const,
      value: state.dashboard.digest.attentionCapabilities,
      description: `${state.dashboard.digest.totalCapabilities} ${copy.cards.trackedCapabilitySuffix}`,
    },
    {
      icon: Wallet,
      label: copy.cards.availablePoints,
      tone: "brand" as const,
      value: state.dashboard.inventory.availablePoints,
      description: `${copy.cards.membershipPrefix} ${state.dashboard.inventory.currentLevelName}`,
    },
    {
      icon: Crown,
      label: copy.cards.featuredUpgradeRoutes,
      tone: "warning" as const,
      value: state.dashboard.inventory.featuredOfferCount,
      description: `${state.dashboard.inventory.subscriptionPlanCount} ${copy.cards.subscriptionPlanSuffix}`,
    },
  ];

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkEntitlementBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-5">
          <section
            className="overflow-hidden rounded-[2rem] border px-6 py-7 shadow-[var(--sdk-shadow-lg)]"
            style={{
              ...createSdkworkEntitlementHeroStyle(),
              ...createSdkworkEntitlementHeroTextStyle(),
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] shadow-[var(--sdk-shadow-soft)]"
                  style={createSdkworkEntitlementToneStyle("accent", {
                    backgroundWeight: 16,
                    borderWeight: 26,
                  })}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.page.eyebrow}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight">{copy.page.title}</h1>
                <p
                  className="mt-3 max-w-2xl text-sm leading-7"
                  style={createSdkworkEntitlementHeroTextStyle("muted")}
                >
                  {copy.page.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {state.dashboard.topAction ? (
                  <Button
                    onClick={() => onNavigate?.(state.dashboard.topAction!.route)}
                    type="button"
                  >
                    {copy.actions.openRecommendedAction}
                  </Button>
                ) : null}
                <Button onClick={() => void controller.refresh()} type="button" variant="outline">
                  {copy.actions.refresh}
                </Button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {heroHighlights.map((highlight) => {
                const Icon = highlight.icon;

                return (
                  <div
                    className="rounded-[1.5rem] border p-5 shadow-[var(--sdk-shadow-sm)] backdrop-blur-xl"
                    key={highlight.label}
                    style={createSdkworkEntitlementGlassStyle(highlight.tone, {
                      backgroundWeight: 14,
                      borderWeight: 26,
                    })}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div
                          className="text-sm"
                          style={createSdkworkEntitlementHeroTextStyle("subtle")}
                        >
                          {highlight.label}
                        </div>
                        <div className="mt-3 text-4xl font-semibold tracking-tight">{highlight.value}</div>
                        <div
                          className="mt-2 text-sm"
                          style={createSdkworkEntitlementHeroTextStyle("subtle")}
                        >
                          {highlight.description}
                        </div>
                      </div>
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                        style={createSdkworkEntitlementToneStyle(highlight.tone, {
                          backgroundWeight: 20,
                          borderWeight: 34,
                        })}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <section
            className="rounded-[1.65rem] border shadow-[var(--sdk-shadow-md)]"
            style={createSdkworkEntitlementPanelStyle("neutral", {
              backgroundWeight: 6,
              borderWeight: 16,
            })}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--sdk-color-text-muted)]">
                  {copy.section.capabilityFiltersEyebrow}
                </div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                  {copy.section.capabilityFiltersTitle}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => controller.setFilter(filter)}
                    size="sm"
                    type="button"
                    variant={state.activeFilter === filter ? "secondary" : "ghost"}
                  >
                    {formatFilter(filter)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
              <div className="grid gap-4 md:grid-cols-2">
                {state.visibleDecisions.length === 0 ? (
                  <div className="col-span-full rounded-[1.3rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
                    {copy.empty.noCapabilitiesInFilter}
                  </div>
                ) : state.visibleDecisions.map((decision) => {
                  const tags = decision.tags ?? [];
                  const tone = resolveSdkworkEntitlementStatusTone(decision.status);

                  return (
                    <button
                      className="rounded-[1.5rem] border p-5 text-left transition-colors shadow-[var(--sdk-shadow-sm)]"
                      key={decision.id}
                      onClick={() => controller.selectCapability(decision.id)}
                      style={state.selectedCapabilityId === decision.id
                        ? createSdkworkEntitlementPanelStyle("accent", {
                          backgroundWeight: 14,
                          borderWeight: 32,
                          surfaceColor: "var(--sdk-color-surface-panel-muted)",
                        })
                        : createSdkworkEntitlementPanelStyle("neutral", {
                          backgroundWeight: 8,
                          borderWeight: 22,
                          surfaceColor: "var(--sdk-color-surface-panel-muted)",
                        })}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">
                            {decision.title}
                          </div>
                          <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                            {decision.description || copy.selected.descriptionFallback}
                          </div>
                        </div>
                        <div
                          className="rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
                          style={createSdkworkEntitlementToneStyle(tone)}
                        >
                          {formatStatus(decision.status)}
                        </div>
                      </div>

                      {tags.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-medium"
                              key={tag}
                              style={createSdkworkEntitlementPanelStyle("neutral", {
                                backgroundWeight: 6,
                                borderWeight: 14,
                                surfaceColor: "var(--sdk-color-surface-panel-muted)",
                              })}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {decision.remainingQuota !== null ? (
                        <div className="mt-5 text-sm font-medium text-[var(--sdk-color-text-secondary)]">
                          {copy.selected.remainingQuotaLabel}: {decision.remainingQuota}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <aside
                className="rounded-[1.65rem] border p-6 shadow-[var(--sdk-shadow-md)]"
                style={createSdkworkEntitlementPanelStyle("accent")}
              >
                {selectedDecision ? (
                  <>
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--sdk-color-text-muted)]">
                      {copy.section.selectedCapability}
                    </div>
                    <h3 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                      {selectedDecision.title} {copy.selected.postureSuffix}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                      {selectedDecision.description || copy.selected.descriptionFallback}
                    </p>

                    <div className="mt-6 space-y-3">
                      <div
                        className="rounded-[1.25rem] border px-4 py-4"
                        style={createSdkworkEntitlementPanelStyle("neutral", {
                          backgroundWeight: 6,
                          borderWeight: 16,
                          surfaceColor: "var(--sdk-color-surface-panel-muted)",
                        })}
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                          {copy.selected.currentStatusLabel}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                          {formatStatus(selectedDecision.status)}
                        </div>
                      </div>

                      {selectedDecision.remainingQuota !== null ? (
                        <div
                          className="rounded-[1.25rem] border px-4 py-4"
                          style={createSdkworkEntitlementPanelStyle("neutral", {
                            backgroundWeight: 6,
                            borderWeight: 16,
                            surfaceColor: "var(--sdk-color-surface-panel-muted)",
                          })}
                        >
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                            {copy.selected.remainingQuotaLabel}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                            {selectedDecision.remainingQuota}
                          </div>
                        </div>
                      ) : null}

                      {selectedDecision.recommendedAction ? (
                        <Button
                          className="w-full"
                          onClick={() => onNavigate?.(selectedDecision.recommendedAction!.route)}
                          type="button"
                        >
                          {selectedDecision.recommendedAction.label}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1.3rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
                    {copy.selected.emptyPrompt}
                  </div>
                )}
              </aside>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SdkworkEntitlementPage({
  locale,
  messages,
  ...props
}: SdkworkEntitlementPageProps) {
  const content = (
    <SdkworkEntitlementPageContent
      {...props}
      locale={locale}
      messages={messages}
    />
  );

  if (locale || messages) {
    return (
      <SdkworkEntitlementIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkEntitlementIntlProvider>
    );
  }

  return content;
}
