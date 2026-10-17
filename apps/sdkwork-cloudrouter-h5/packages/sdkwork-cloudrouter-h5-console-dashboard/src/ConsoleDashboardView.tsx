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

/**
 * Overview stat tiles. The section spans the viewport edge-to-edge (square
 * corners); the tiles are inset elements inside it and may keep a radius.
 */
export function ConsoleDashboardView({ snapshot, locale, labels }: ConsoleDashboardViewProps) {
  const cards = [
    { id: 'requests', label: labels.requests, value: formatTokenCount(snapshot.totalRequests, locale) },
    { id: 'tokens', label: labels.tokens, value: formatTokenCount(snapshot.totalTokens, locale) },
    { id: 'cost', label: labels.cost, value: formatMinorUnitsAsCurrency(snapshot.costMinorUnits, snapshot.currency, locale) },
    { id: 'errorRate', label: labels.errorRate, value: formatPercent(snapshot.errorRate, locale) },
  ];
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.id} className="rounded-xl bg-black/30 p-3">
            <p className="text-[11px] text-gray-400">{card.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>
      {snapshot.windowLabel && (
        <p className="mt-3 text-[10px] text-gray-500">{snapshot.windowLabel}</p>
      )}
    </Panel>
  );
}
