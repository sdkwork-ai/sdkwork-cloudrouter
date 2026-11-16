import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Cable, Database, Download, FileSpreadsheet, Layers3, ScrollText, ShieldCheck, Table2 } from 'lucide-react';
import { DataCenterService } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterPageHeader,
  DataCenterPendingNotice,
  DataCenterPhaseBadge,
  type DataCenterPhase,
} from '../components/DataCenterShell.tsx';

interface CapabilityCard {
  key: string;
  icon: typeof Cable;
  phase: DataCenterPhase;
}

const CAPABILITIES: readonly CapabilityCard[] = [
  { key: 'sources', icon: Cable, phase: 'p0' },
  { key: 'imports', icon: FileSpreadsheet, phase: 'p0' },
  { key: 'tables', icon: Table2, phase: 'p0' },
  { key: 'studio', icon: Database, phase: 'p0' },
  { key: 'exports', icon: Download, phase: 'p0' },
  { key: 'audits', icon: ScrollText, phase: 'p0' },
  { key: 'pipelines', icon: Layers3, phase: 'p1' },
  { key: 'services', icon: ShieldCheck, phase: 'p2' },
];

const ONBOARDING_STEPS = ['source', 'table', 'dataset', 'service'] as const;

export function DataCenterOverviewPage() {
  const { t } = useTranslation();
  const load = useCallback(() => DataCenterService.fetchOverview(), []);
  const state = useDataCenterQuery(load);

  const kpis = [
    { key: 'sources', value: state.phase === 'ready' ? String(state.data.sources) : '—' },
    { key: 'tables', value: state.phase === 'ready' ? String(state.data.tables) : '—' },
    { key: 'instances', value: state.phase === 'ready' ? String(state.data.todayInstances) : '—' },
    { key: 'exports', value: state.phase === 'ready' ? String(state.data.pendingExports) : '—' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <DataCenterPageHeader
        title={t('admin.dataCenter.overview.title', 'Data Center')}
        description={t(
          'admin.dataCenter.overview.description',
          'A standalone data platform inside the admin console: connect sources, land tables, develop and schedule SQL, check quality, and publish governed data services.',
        )}
      />

      {state.phase === 'pending-backend' ? <DataCenterPendingNotice /> : null}

      <section aria-label={t('admin.dataCenter.overview.kpi.section', 'Data center metrics')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.key}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#161a21]"
            >
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(`admin.dataCenter.overview.kpi.${kpi.key}`, kpi.key)}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{kpi.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#161a21]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.dataCenter.overview.capabilities.title', 'Capability map')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.dataCenter.overview.capabilities.description', 'What this module owns, and when each capability ships.')}
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <li
                key={capability.key}
                className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-white/5 dark:bg-white/5"
              >
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-lobster-500" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t(`admin.dataCenter.overview.capabilities.${capability.key}.name`, capability.key)}
                    </span>
                    <DataCenterPhaseBadge phase={capability.phase} />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {t(`admin.dataCenter.overview.capabilities.${capability.key}.description`, '')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#161a21]">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('admin.dataCenter.overview.onboarding.title', 'Get to your first governed dataset')}
        </h2>
        <ol className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={step} className="rounded-md border border-slate-100 px-3 py-2.5 dark:border-white/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-lobster-500/10 text-[11px] text-lobster-600 dark:text-lobster-400">
                  {index + 1}
                </span>
                {t(`admin.dataCenter.overview.onboarding.${step}.title`, step)}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                {t(`admin.dataCenter.overview.onboarding.${step}.description`, '')}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.dataCenter.overview.onboarding.note', 'Data Center never reads or migrates pages from the other admin modules.')}
        </p>
      </section>
    </div>
  );
}
