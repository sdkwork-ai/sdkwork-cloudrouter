import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  RefreshCw,
  ReceiptText,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  LoadingBlock,
  StatusNotice,
} from '@sdkwork/ui-pc-react';
import {
  createSdkworkOrderController,
  createSdkworkOrderToneStyle,
  SdkworkOrderDetailDrawer,
  SdkworkOrderIntlProvider,
  useSdkworkOrderControllerState,
  useSdkworkOrderIntl,
  type SdkworkOrderController,
  type SdkworkOrderFilter,
  type SdkworkOrderMessagesOverrides,
  type SdkworkOrderVisualTone,
} from '@sdkwork/order-pc-order';

import { resolveConsoleOrderLocale } from './consoleCommerceLocale.ts';

const SETTLEMENTS_FILTERS: SdkworkOrderFilter[] = [
  'all',
  'pending-payment',
  'paid',
  'completed',
  'cancelled',
];

function isZhLocale(locale: string | null | undefined): boolean {
  return String(locale || '').trim().toLowerCase().startsWith('zh');
}

function createSettlementsOverrides(locale: string | null | undefined): SdkworkOrderMessagesOverrides {
  if (isZhLocale(locale)) {
    return {
      page: {
        description: '集中查看账单历史、支付状态与消费汇总，掌握每一笔账单的完整生命周期。',
        title: '账单与报表',
      },
      views: {
        empty: '当前筛选条件下没有匹配的账单记录。',
        eyebrow: '明细',
        title: '账单明细',
      },
      pagination: {
        summary: '共 {total} 条账单，当前展示 {shown} 条',
      },
      stats: {
        completed: '已完成',
        pendingPayment: '待支付',
        totalAmount: '消费总额',
        totalOrders: '账单总数',
      },
    };
  }

  return {
    page: {
      description: 'Review billing history, payment status, and spending summaries — all in one place.',
      title: 'Bills & Reports',
    },
    views: {
      empty: 'No bills matched the current filter.',
      eyebrow: 'Details',
      title: 'Billing Details',
    },
    pagination: {
      summary: 'Showing {shown} of {total} bills',
    },
    stats: {
      completed: 'Completed',
      pendingPayment: 'Pending',
      totalAmount: 'Total Spend',
      totalOrders: 'Total Bills',
    },
  };
}

function resolveStatusTone(status: string): SdkworkOrderVisualTone {
  if (status === 'pending-payment') {
    return 'warning';
  }

  if (status === 'paid' || status === 'completed') {
    return 'success';
  }

  if (status === 'cancelled' || status === 'expired') {
    return 'danger';
  }

  if (status === 'refunding' || status === 'refunded') {
    return 'warning';
  }

  return 'neutral';
}

interface SettlementsStat {
  icon: typeof ReceiptText;
  label: string;
  tone: SdkworkOrderVisualTone;
  value: string;
}

function SettlementsPagination({ controller }: { controller: SdkworkOrderController }) {
  const state = useSdkworkOrderControllerState(controller);
  const { copy, formatPaginationPageLabel, formatPaginationSummary } = useSdkworkOrderIntl();
  const pagination = state.dashboard.pagination;
  const totalPages = pagination.totalPages ?? 0;
  const page = pagination.page;
  const shown = state.visibleOrders.length;
  const total = pagination.total;
  const hasPrev = page > 1;
  const hasNext = pagination.hasMore || page < totalPages;

  if (total === 0 && !state.isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--sdk-color-border-subtle)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-[var(--sdk-color-text-secondary)]">
        {formatPaginationSummary(shown, total)}
      </div>
      <div className="flex items-center gap-2">
        <Button
          aria-label={copy.pagination.prev}
          disabled={!hasPrev || state.isLoading}
          onClick={() => void controller.setPage(page - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{copy.pagination.prev}</span>
        </Button>
        <span
          aria-live="polite"
          className="min-w-[7.5rem] text-center text-xs font-medium text-[var(--sdk-color-text-primary)]"
        >
          {formatPaginationPageLabel(page, Math.max(totalPages, page))}
        </span>
        <Button
          aria-label={copy.pagination.next}
          disabled={!hasNext || state.isLoading}
          onClick={() => void controller.setPage(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span>{copy.pagination.next}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SettlementsPageContent({ controller }: { controller: SdkworkOrderController }) {
  const state = useSdkworkOrderControllerState(controller);
  const {
    copy,
    formatCurrencyCny,
    formatFilter,
    formatStatus,
    formatTimestamp,
    locale,
  } = useSdkworkOrderIntl();
  const zh = isZhLocale(locale);

  const stats: SettlementsStat[] = useMemo(() => [
    {
      icon: ReceiptText,
      label: copy.stats.totalOrders,
      tone: 'brand',
      value: String(state.dashboard.statistics.totalOrders),
    },
    {
      icon: Clock3,
      label: copy.stats.pendingPayment,
      tone: 'warning',
      value: String(state.dashboard.statistics.pendingPayment),
    },
    {
      icon: BadgeCheck,
      label: copy.stats.completed,
      tone: 'success',
      value: String(state.dashboard.statistics.completed),
    },
    {
      icon: CircleDollarSign,
      label: copy.stats.totalAmount,
      tone: 'accent',
      value: formatCurrencyCny(state.dashboard.statistics.totalAmountCny),
    },
  ], [copy, state.dashboard.statistics, formatCurrencyCny]);

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  const showInitialLoading = state.isLoading && !state.isBootstrapped;
  const showEmpty = !showInitialLoading && state.visibleOrders.length === 0;
  const showTable = !showInitialLoading && !showEmpty;

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="space-y-4">
          {/* Header */}
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                {copy.page.title}
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-[var(--sdk-color-text-secondary)]">
                {copy.page.description}
              </p>
            </div>
            <Button
              disabled={state.isLoading}
              onClick={() => void controller.refresh()}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw className={state.isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              <span>{zh ? '刷新' : 'Refresh'}</span>
            </Button>
          </header>

          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="rounded-2xl border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4 shadow-[var(--sdk-shadow-sm)]"
                  key={stat.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--sdk-color-text-secondary)]">{stat.label}</span>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={createSdkworkOrderToneStyle(stat.tone, { backgroundWeight: 14, borderWeight: 24 })}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[var(--sdk-color-text-primary)]">
                    {stat.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {state.lastError ? (
            <StatusNotice title={copy.page.errorTitle} tone="danger">
              {state.lastError}
            </StatusNotice>
          ) : null}

          {/* Table panel */}
          <section className="overflow-hidden rounded-2xl border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--sdk-color-border-subtle)] px-3 py-2">
              {SETTLEMENTS_FILTERS.map((filter) => {
                const active = state.activeFilter === filter;

                return (
                  <button
                    className={
                      active
                        ? 'rounded-lg bg-[var(--sdk-color-brand-primary)] px-3 py-1.5 text-sm font-medium text-white transition-colors'
                        : 'rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--sdk-color-text-secondary)] transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)] hover:text-[var(--sdk-color-text-primary)]'
                    }
                    key={filter}
                    onClick={() => void controller.setFilter(filter)}
                    type="button"
                  >
                    {formatFilter(filter)}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            {showInitialLoading ? (
              <LoadingBlock label={copy.page.loading} />
            ) : showEmpty ? (
              <div className="px-6 py-12">
                <EmptyState
                  description={copy.views.empty}
                  title={copy.views.title}
                />
              </div>
            ) : showTable ? (
              <>
                <div className="overflow-x-auto" aria-busy={state.isLoading || undefined}>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--sdk-color-border-subtle)]">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sdk-color-text-muted)]" scope="col">
                          {zh ? '账单编号' : 'Bill ID'}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sdk-color-text-muted)]" scope="col">
                          {zh ? '摘要' : 'Subject'}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sdk-color-text-muted)]" scope="col">
                          {copy.detail.status}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--sdk-color-text-muted)]" scope="col">
                          {copy.overview.createdAt}
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--sdk-color-text-muted)]" scope="col">
                          {zh ? '金额' : 'Amount'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--sdk-color-border-subtle)]">
                      {state.visibleOrders.map((order) => {
                        const tone = resolveStatusTone(order.status);
                        const billId = order.orderSn || `#${order.id.slice(-8)}`;

                        return (
                          <tr
                            className="cursor-pointer select-none transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)]"
                            key={order.id}
                            onClick={() => void controller.openDetail(order.id)}
                          >
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm font-mono text-[var(--sdk-color-text-secondary)]">
                              {billId}
                            </td>
                            <td className="max-w-[20rem] truncate px-4 py-3.5 text-sm font-medium text-[var(--sdk-color-text-primary)]">
                              {order.subject}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={createSdkworkOrderToneStyle(tone, { backgroundWeight: 10, borderWeight: 20 })}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={createSdkworkOrderToneStyle(tone, { backgroundWeight: 50 })}
                                />
                                {formatStatus(order.status, order.statusLabel)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[var(--sdk-color-text-secondary)]">
                              {formatTimestamp(order.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                              {formatCurrencyCny(order.totalAmountCny)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <SettlementsPagination controller={controller} />
              </>
            ) : null}
          </section>
        </div>
      </div>

      <SdkworkOrderDetailDrawer controller={controller} />
    </div>
  );
}

export function ConsoleSettlementsView() {
  const { i18n } = useTranslation();
  const locale = resolveConsoleOrderLocale(i18n.resolvedLanguage ?? i18n.language);
  const messages = useMemo(() => createSettlementsOverrides(locale), [locale]);
  const controller = useMemo(
    () => createSdkworkOrderController({ locale, messages }),
    [locale, messages],
  );

  return (
    <SdkworkOrderIntlProvider locale={locale} messages={messages}>
      <SettlementsPageContent controller={controller} />
    </SdkworkOrderIntlProvider>
  );
}
