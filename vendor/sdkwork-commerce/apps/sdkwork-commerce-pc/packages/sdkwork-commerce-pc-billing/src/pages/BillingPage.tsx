import { useEffect } from "react";
import {
  CreditCard,
  ReceiptText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  EmptyState,
  LoadingBlock,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import type { SdkworkBillingBreakdownKey } from "../billing";
import type { SdkworkBillingMessagesOverrides } from "../billing-copy";
import type { SdkworkBillingController } from "../billing-controller";
import {
  useSdkworkBillingController,
  useSdkworkBillingControllerState,
} from "../billing-controller";
import {
  createSdkworkBillingBackdropStyle,
  createSdkworkBillingGlassStyle,
  createSdkworkBillingHeroStyle,
  createSdkworkBillingHeroTextStyle,
  createSdkworkBillingPanelStyle,
  createSdkworkBillingToneStyle,
} from "../billing-appearance";
import {
  SdkworkBillingIntlProvider,
  useSdkworkBillingIntl,
} from "../billing-intl";
import type { SdkworkBillingService } from "../billing-service";
import { SdkworkBillingBreakdownTable } from "../components/BillingBreakdownTable";
import { SdkworkBillingSummaryCards } from "../components/BillingSummaryCards";

export interface SdkworkBillingPageProps {
  controller?: SdkworkBillingController;
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  onNavigate?: (route: string) => void;
  service?: Partial<SdkworkBillingService>;
}

interface SdkworkBillingPageContentProps {
  controller?: SdkworkBillingController;
  locale?: string | null;
  messages?: SdkworkBillingMessagesOverrides;
  onNavigate?: (route: string) => void;
  service?: Partial<SdkworkBillingService>;
}

function resolveAlertTone(severity: "critical" | "info" | "warning") {
  if (severity === "critical") {
    return "danger" as const;
  }

  if (severity === "warning") {
    return "warning" as const;
  }

  return "brand" as const;
}

function SdkworkBillingPageContent({
  controller: controllerProp,
  locale,
  messages,
  onNavigate,
  service,
}: SdkworkBillingPageContentProps) {
  const controller = useSdkworkBillingController(controllerProp, {
    locale,
    messages,
    service,
  });
  const state = useSdkworkBillingControllerState(controller);
  const {
    copy,
    formatActivePackages,
    formatAlert,
    formatAvailablePoints,
    formatPaymentMethod,
    formatPlanPosture,
    formatPosture,
    formatStatus,
    formatTimestamp,
    formatTopActionLabel,
  } = useSdkworkBillingIntl();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  const activeRows = state.dashboard.breakdowns[state.activeBreakdown] ?? [];
  const tabs = [
    {
      label: copy.tabs.overview,
      value: "overview" as const,
    },
    {
      label: copy.tabs.invoices,
      value: "invoices" as const,
    },
  ];
  const breakdownOptions: Array<{
    label: string;
    value: SdkworkBillingBreakdownKey;
  }> = [
    {
      label: copy.breakdown.provider,
      value: "provider",
    },
    {
      label: copy.breakdown.model,
      value: "model",
    },
    {
      label: copy.breakdown.capability,
      value: "capability",
    },
    {
      label: copy.breakdown.workspace,
      value: "workspace",
    },
  ];
  const primaryHeroTextStyle = createSdkworkBillingHeroTextStyle();
  const mutedHeroTextStyle = createSdkworkBillingHeroTextStyle("muted");
  const subtleHeroTextStyle = createSdkworkBillingHeroTextStyle("subtle");

  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={createSdkworkBillingBackdropStyle()}
      />

      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto max-w-[96rem] space-y-5">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)]">
            <div
              className="overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-6 py-7 text-white shadow-[var(--sdk-shadow-lg)]"
              style={createSdkworkBillingHeroStyle()}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] backdrop-blur-xl"
                    style={{
                      ...createSdkworkBillingGlassStyle("neutral", {
                        backgroundWeight: 8,
                        borderWeight: 18,
                        surfaceWeight: 74,
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
                  {state.dashboard.topAction ? (
                    <Button onClick={() => onNavigate?.(state.dashboard.topAction!.route)} type="button">
                      {formatTopActionLabel(state.dashboard.topAction)}
                    </Button>
                  ) : null}
                  <Button onClick={() => void controller.refresh()} type="button" variant="outline">
                    {copy.actions.refresh}
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                <div
                  className="rounded-[1.5rem] border p-5 backdrop-blur-xl"
                  style={createSdkworkBillingGlassStyle("accent", {
                    backgroundWeight: 12,
                    borderWeight: 24,
                    surfaceWeight: 78,
                  })}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm" style={mutedHeroTextStyle}>{copy.cards.thisMonth}</div>
                      <div className="mt-3 text-4xl font-semibold tracking-tight">
                        {formatSdkworkCurrencyCny(state.dashboard.digest.monthSpendCny)}
                      </div>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                      style={createSdkworkBillingToneStyle("accent", {
                        backgroundWeight: 16,
                        borderWeight: 24,
                      })}
                    >
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[1.5rem] border p-5 backdrop-blur-xl"
                  style={createSdkworkBillingGlassStyle("warning", {
                    backgroundWeight: 12,
                    borderWeight: 24,
                    surfaceWeight: 78,
                  })}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm" style={mutedHeroTextStyle}>{copy.cards.outstandingAttention}</div>
                      <div className="mt-3 text-4xl font-semibold tracking-tight">
                        {formatSdkworkCurrencyCny(state.dashboard.paymentAttention.outstandingAmountCny)}
                      </div>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                      style={createSdkworkBillingToneStyle("warning", {
                        backgroundWeight: 16,
                        borderWeight: 24,
                      })}
                    >
                      <CreditCard className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-[1.5rem] border p-5 backdrop-blur-xl"
                  style={createSdkworkBillingGlassStyle("danger", {
                    backgroundWeight: 12,
                    borderWeight: 24,
                    surfaceWeight: 78,
                  })}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm" style={mutedHeroTextStyle}>{copy.cards.posture}</div>
                      <div className="mt-3 text-4xl font-semibold tracking-tight">
                        {formatPosture(state.dashboard.posture)}
                      </div>
                      <div className="mt-2 text-sm" style={subtleHeroTextStyle}>
                        {formatPlanPosture(state.dashboard.summary.currentLevelName)}
                      </div>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                      style={createSdkworkBillingToneStyle("danger", {
                        backgroundWeight: 16,
                        borderWeight: 24,
                      })}
                    >
                      <ReceiptText className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <div
                className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
                style={createSdkworkBillingPanelStyle("neutral", {
                  backgroundWeight: 6,
                  borderWeight: 14,
                })}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.highlights.currentPlan}</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
                  {state.dashboard.summary.currentLevelName}
                </div>
                <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatActivePackages(state.dashboard.summary.activeSubscriptionPlans)}
                </div>
              </div>

              <div
                className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
                style={createSdkworkBillingPanelStyle("accent", {
                  backgroundWeight: 8,
                  borderWeight: 18,
                })}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.highlights.savingsOpportunity}</div>
                <div className="mt-3 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatSdkworkCurrencyCny(state.dashboard.summary.bestOfferSavingsCny)}
                </div>
                <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatAvailablePoints(state.dashboard.summary.availablePoints)}
                </div>
              </div>
            </div>
          </section>

          {state.isLoading && !state.isBootstrapped ? <LoadingBlock label={copy.page.loading} /> : null}

          {state.lastError ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
            <div className="flex flex-col gap-4 border-b border-[var(--sdk-color-border-subtle)] px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.views.eyebrow}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.views.title}</h2>
              </div>

              <div className="inline-flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.value}
                    onClick={() => controller.setTab(tab.value)}
                    type="button"
                    variant={state.activeTab === tab.value ? "secondary" : "ghost"}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {state.activeTab === "overview" ? (
              <div className="space-y-5 px-6 py-6">
                <SdkworkBillingSummaryCards
                  digest={state.dashboard.digest}
                  posture={state.dashboard.posture}
                />

                {state.dashboard.alerts.length > 0 ? (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {state.dashboard.alerts.map((alert) => {
                      const resolvedAlert = formatAlert(alert);
                      const tone = resolveAlertTone(alert.severity);

                      return (
                        <article
                          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] p-5"
                          key={alert.id}
                          style={createSdkworkBillingPanelStyle(tone, {
                            backgroundWeight: 8,
                            borderWeight: 18,
                            surfaceColor: "var(--sdk-color-surface-panel-muted)",
                          })}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div
                                className="inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
                                style={createSdkworkBillingToneStyle(tone, {
                                  backgroundWeight: 12,
                                  borderWeight: 22,
                                })}
                              >
                                {resolvedAlert.severityLabel}
                              </div>
                              <div className="mt-2 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
                                {resolvedAlert.title}
                              </div>
                            </div>
                            {resolvedAlert.value ? (
                              <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                                {resolvedAlert.value}
                              </div>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                            {resolvedAlert.description}
                          </p>
                          {alert.action ? (
                            <div className="mt-4">
                              <Button onClick={() => onNavigate?.(alert.action!.route)} type="button" variant="outline">
                                {resolvedAlert.actionLabel || alert.action.label}
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                ) : null}

                <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
                  <div className="flex flex-col gap-4 border-b border-[var(--sdk-color-border-subtle)] px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.breakdown.eyebrow}</div>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.breakdown.title}</h3>
                    </div>

                    <div className="inline-flex flex-wrap gap-2">
                      {breakdownOptions.map((option) => (
                        <Button
                          key={option.value}
                          onClick={() => controller.setBreakdown(option.value)}
                          type="button"
                          variant={state.activeBreakdown === option.value ? "secondary" : "ghost"}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-5">
                    <SdkworkBillingBreakdownTable
                      onSelect={(rowId) => controller.selectBreakdown(rowId)}
                      rows={activeRows}
                      selectedRowId={state.selectedBreakdownId}
                    />
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
                  <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.usage.eyebrow}</div>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.usage.title}</h3>
                  </div>

                  <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
                    {state.visibleUsage.length === 0 ? (
                      <div className="px-6 py-10">
                        <EmptyState
                          description={copy.usage.emptyDescription}
                          title={copy.usage.emptyTitle}
                        />
                      </div>
                    ) : state.visibleUsage.map((record) => (
                      <article className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between" key={record.id}>
                        <div>
                          <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">
                            {record.title}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--sdk-color-text-secondary)]">
                            <span>{record.provider}</span>
                            <span>{record.workspace}</span>
                            <span>{formatTimestamp(record.usageAt)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-right text-sm text-[var(--sdk-color-text-secondary)]">
                            {record.units} {record.unitLabel}
                          </div>
                          <div className="text-right font-semibold text-[var(--sdk-color-text-primary)]">
                            {formatSdkworkCurrencyCny(record.costCny)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="grid gap-5 px-6 py-6 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] shadow-[var(--sdk-shadow-sm)]">
                  <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.invoiceAttention.eyebrow}</div>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.invoiceAttention.title}</h3>
                  </div>

                  <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
                    {state.dashboard.invoiceAttention.recentInvoices.length === 0 ? (
                      <div className="px-6 py-10">
                        <EmptyState
                          description={copy.invoiceAttention.emptyDescription}
                          title={copy.invoiceAttention.emptyTitle}
                        />
                      </div>
                    ) : state.dashboard.invoiceAttention.recentInvoices.map((invoice) => (
                      <article className="flex items-center justify-between gap-4 px-6 py-5" key={invoice.id}>
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">
                            {invoice.title}
                          </div>
                          <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                            {formatStatus(invoice.status, invoice.statusLabel)} / {formatTimestamp(invoice.createdAt)}
                          </div>
                        </div>
                        <div className="text-right font-semibold text-[var(--sdk-color-text-primary)]">
                          {formatSdkworkCurrencyCny(invoice.totalAmountCny)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] shadow-[var(--sdk-shadow-sm)]">
                  <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.paymentAttention.eyebrow}</div>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.paymentAttention.title}</h3>
                  </div>

                  <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
                    {state.dashboard.paymentAttention.recentPayments.length === 0 ? (
                      <div className="px-6 py-10">
                        <EmptyState
                          description={copy.paymentAttention.emptyDescription}
                          title={copy.paymentAttention.emptyTitle}
                        />
                      </div>
                    ) : state.dashboard.paymentAttention.recentPayments.map((payment) => (
                      <article className="flex items-center justify-between gap-4 px-6 py-5" key={payment.id}>
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">
                            {formatPaymentMethod(payment.paymentMethod || payment.paymentProvider)}
                          </div>
                          <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                            {formatStatus(payment.status, payment.statusLabel)} / {formatTimestamp(payment.createdAt)}
                          </div>
                        </div>
                        <div className="text-right font-semibold text-[var(--sdk-color-text-primary)]">
                          {formatSdkworkCurrencyCny(payment.amountCny)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function SdkworkBillingPage({
  locale,
  messages,
  ...props
}: SdkworkBillingPageProps) {
  const content = (
    <SdkworkBillingPageContent
      {...props}
      locale={locale}
      messages={messages}
    />
  );

  if (locale || messages) {
    return (
      <SdkworkBillingIntlProvider locale={locale} messages={messages}>
        {content}
      </SdkworkBillingIntlProvider>
    );
  }

  return content;
}
