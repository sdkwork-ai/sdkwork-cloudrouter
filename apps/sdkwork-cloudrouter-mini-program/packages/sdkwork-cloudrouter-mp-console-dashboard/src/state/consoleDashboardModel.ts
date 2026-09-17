import type { ConsoleOverviewSnapshot } from '@sdkwork/cloudrouter-contracts';
import { formatMinorUnitsAsCurrency, formatPercent, formatTokenCount } from '@sdkwork/cloudrouter-service';

export interface ConsoleDashboardLabels {
  readonly title: string;
  readonly requests: string;
  readonly tokens: string;
  readonly cost: string;
  readonly errorRate: string;
  readonly loading: string;
  readonly empty: string;
  readonly reload: string;
}

export interface ConsoleDashboardMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export interface ConsoleDashboardState {
  readonly labels: ConsoleDashboardLabels;
  readonly loading: boolean;
  readonly error: string | null;
  readonly metrics: readonly ConsoleDashboardMetric[];
  setLoading(value: boolean): void;
  setError(value: string | null): void;
  setSnapshot(snapshot: ConsoleOverviewSnapshot): void;
}

/** Derives the metric cards the WXML template renders. */
export function toConsoleDashboardMetrics(
  snapshot: ConsoleOverviewSnapshot,
  locale: string,
  labels: ConsoleDashboardLabels,
): readonly ConsoleDashboardMetric[] {
  return [
    { id: 'requests', label: labels.requests, value: formatTokenCount(snapshot.totalRequests, locale) },
    { id: 'tokens', label: labels.tokens, value: formatTokenCount(snapshot.totalTokens, locale) },
    {
      id: 'cost',
      label: labels.cost,
      value: formatMinorUnitsAsCurrency(snapshot.costMinorUnits, snapshot.currency, locale),
    },
    { id: 'errorRate', label: labels.errorRate, value: formatPercent(snapshot.errorRate, locale) },
  ];
}

export function createConsoleDashboardState(labels: ConsoleDashboardLabels): ConsoleDashboardState {
  let loading = true;
  let error: string | null = null;
  let metrics: readonly ConsoleDashboardMetric[] = [];
  return {
    labels,
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get metrics() {
      return metrics;
    },
    setLoading(value) {
      loading = value;
    },
    setError(value) {
      error = value;
    },
    setSnapshot(snapshot) {
      metrics = toConsoleDashboardMetrics(snapshot, 'zh-CN', labels);
    },
  };
}
