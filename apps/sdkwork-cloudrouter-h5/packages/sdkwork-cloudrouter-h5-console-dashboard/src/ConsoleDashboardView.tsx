import { Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleOverviewSnapshot } from '@sdkwork/cloudrouter-contracts';
import {
  formatMinorUnitsAsCurrency,
  formatPercent,
  formatTokenCount,
} from '@sdkwork/cloudrouter-service';

export interface ConsoleDashboardLabels {
  readonly requests: string;
  readonly tokens: string;
  readonly cost: string;
  readonly errorRate: string;
}

export interface ConsoleDashboardViewProps {
  readonly snapshot: ConsoleOverviewSnapshot;
  readonly locale: string;
  readonly labels: ConsoleDashboardLabels;
}

export function ConsoleDashboardView({ snapshot, locale, labels }: ConsoleDashboardViewProps) {
  const cards = [
    { id: 'requests', label: labels.requests, value: formatTokenCount(snapshot.totalRequests, locale) },
    { id: 'tokens', label: labels.tokens, value: formatTokenCount(snapshot.totalTokens, locale) },
    { id: 'cost', label: labels.cost, value: formatMinorUnitsAsCurrency(snapshot.costMinorUnits, snapshot.currency, locale) },
    { id: 'errorRate', label: labels.errorRate, value: formatPercent(snapshot.errorRate, locale) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Panel key={card.id}>
          <p className="text-[11px] text-gray-400">{card.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
        </Panel>
      ))}
    </div>
  );
}
