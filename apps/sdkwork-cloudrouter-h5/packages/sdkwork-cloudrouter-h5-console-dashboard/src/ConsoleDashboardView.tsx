import { PageHeader, Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleOverviewSnapshot } from '@sdkwork/cloudrouter-contracts';
import {
  formatMinorUnitsAsCurrency,
  formatPercent,
  formatTokenCount,
} from '@sdkwork/cloudrouter-service';

export interface ConsoleDashboardLabels {
  readonly title: string;
  readonly summary: string;
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
 * corners); the tiles are inset elements inside it and keep a radius. Tile
 * surfaces and labels use the shared theme tokens so the overview matches the
 * PC console in both schemes.
 */
export function ConsoleDashboardView({ snapshot, locale, labels }: ConsoleDashboardViewProps) {
  const cards = [
    { id: 'requests', label: labels.requests, value: formatTokenCount(snapshot.totalRequests, locale) },
    { id: 'tokens', label: labels.tokens, value: formatTokenCount(snapshot.totalTokens, locale) },
    { id: 'cost', label: labels.cost, value: formatMinorUnitsAsCurrency(snapshot.costMinorUnits, snapshot.currency, locale) },
    { id: 'errorRate', label: labels.errorRate, value: formatPercent(snapshot.errorRate, locale) },
  ];
  return (
    <div className="flex flex-col">
      <PageHeader title={labels.title} summary={labels.summary} />
      <Panel>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <div key={card.id} className="rounded-xl border border-line bg-canvas p-3.5">
              <p className="text-[11px] text-ink-subtle">{card.label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-ink">{card.value}</p>
            </div>
          ))}
        </div>
        {snapshot.windowLabel && (
          <p className="mt-3 text-[10px] text-ink-subtle">{snapshot.windowLabel}</p>
        )}
      </Panel>
    </div>
  );
}
