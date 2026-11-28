import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Cable, Database, Download, ExternalLink, FileSpreadsheet, Layers3, MonitorPlay, ScrollText, ShieldCheck, Table2 } from 'lucide-react';
import { DataCenterService } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterErrorNotice,
  DataCenterPageHeader,
  DataCenterPhaseBadge,
  type DataCenterPhase,
} from '../components/DataCenterShell.tsx';

interface CapabilityCard {
  key: string;
  icon: typeof Cable;
  /** Route that owns the capability, or `null` while it is design-only. */
  route: string | null;
}

const CAPABILITIES: readonly CapabilityCard[] = [
  { key: 'sources', icon: Cable, route: '/admin/data/sources' },
  { key: 'tables', icon: Table2, route: '/admin/data/tables' },
  { key: 'exports', icon: Download, route: '/admin/data/exports' },
  { key: 'audits', icon: ScrollText, route: '/admin/data/audits' },
  { key: 'imports', icon: FileSpreadsheet, route: null },
  { key: 'studio', icon: Database, route: null },
  { key: 'pipelines', icon: Layers3, route: null },
  { key: 'services', icon: ShieldCheck, route: null },
];

/** Capability stage: what this deployment actually serves. */
const CAPABILITY_PHASES: Readonly<Record<string, DataCenterPhase>> = {
  sources: 'p0',
  tables: 'p0',
  exports: 'p0',
  audits: 'p0',
  imports: 'p1',
  studio: 'p1',
  pipelines: 'p2',
  services: 'p2',
};

const ONBOARDING_STEPS = ['source', 'table', 'dataset', 'service'] as const;

/**
 * Console URL of the operator data wall. The host mounts it full-bleed (its own
 * route branch, outside the admin layout), so this page only links to it.
 */
export const DATA_CENTER_SCREEN_PATH = '/admin/data/screen';

/**
 * Opens the operator data wall in its own window.
 *
 * The wall is a presentation surface: an operator puts it on a meeting-room
 * display while the console stays usable in this tab. A blocked popup (or a host
 * embedding this page in a frame) falls back to a same-tab navigation instead of
 * doing nothing, so the action always lands somewhere.
 */
function openDataWall(): void {
  const target = new URL(DATA_CENTER_SCREEN_PATH, window.location.origin).toString();
  const popup = window.open(target, 'sdkwork-cloudrouter-data-screen', 'popup=yes,width=1920,height=1080');
  if (!popup || popup.closed) {
    window.location.assign(DATA_CENTER_SCREEN_PATH);
  }
}

export function DataCenterOverviewPage() {
  const { t } = useTranslation();
  const load = useCallback(() => DataCenterService.fetchOverview(), []);
  const state = useDataCenterQuery(load);

  const kpis = [
    {
      key: 'sources',
      value: state.phase === 'ready' ? state.data.sources : '—',
      to: '/admin/data/sources',
    },
    {
      key: 'tables',
      value: state.phase === 'ready' ? state.data.tables : '—',
      to: '/admin/data/tables',
    },
    {
      key: 'instances',
      value: state.phase === 'ready' ? state.data.todayInstances : '—',
      to: '/admin/data/audits',
    },
    {
      key: 'exports',
      value: state.phase === 'ready' ? state.data.pendingExports : '—',
      to: '/admin/data/exports',
    },
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

      {state.phase === 'error' ? (
        <DataCenterErrorNotice message={state.message} onRetry={() => void load()} />
      ) : null}

      <section
        aria-label={t('admin.dataCenter.overview.screen.section', 'Operator data wall')}
        className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#161a21]"
        data-data-screen-entry
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-lobster-500/10 text-lobster-600 dark:text-lobster-400">
              <MonitorPlay aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.dataCenter.overview.screen.title', 'Operator data wall')}
              </h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t(
                  'admin.dataCenter.overview.screen.description',
                  'A full-screen business wall — tokens, API calls, paid orders, revenue, recharges, users and live traces — built from the management APIs this platform already owns. It opens in its own window with no console chrome, refreshes every minute, and names any module it cannot reach.',
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              onClick={openDataWall}
              type="button"
            >
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.dataCenter.overview.screen.openWindow', 'Open in new window')}
            </button>
            <Link
              className="inline-flex items-center gap-1.5 rounded-md bg-lobster-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lobster-600"
              data-data-screen-enter
              to={DATA_CENTER_SCREEN_PATH}
            >
              <MonitorPlay aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.dataCenter.overview.screen.open', 'Open data wall')}
            </Link>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 text-xs dark:border-white/10 dark:bg-white/10 xl:grid-cols-4">
          {(['tokens', 'calls', 'revenue', 'live'] as const).map((item) => (
            <div className="bg-white px-4 py-2.5 dark:bg-[#161a21]" key={item}>
              <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {t(`admin.dataCenter.overview.screen.items.${item}.label`, item)}
              </dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
                {t(`admin.dataCenter.overview.screen.items.${item}.description`, '')}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={t('admin.dataCenter.overview.kpi.section', 'Data center metrics')}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.key}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-lobster-300 dark:border-white/10 dark:bg-[#161a21] dark:hover:border-lobster-500/40"
              to={kpi.to}
            >
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(`admin.dataCenter.overview.kpi.${kpi.key}`, kpi.key)}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{kpi.value}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#161a21]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.dataCenter.overview.capabilities.title', 'Capability map')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              'admin.dataCenter.overview.capabilities.description',
              'What this module owns, and when each capability ships. Capabilities without a page are not delivered in this release.',
            )}
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            const content = (
              <>
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-lobster-500" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t(`admin.dataCenter.overview.capabilities.${capability.key}.name`, capability.key)}
                    </span>
                    <DataCenterPhaseBadge phase={CAPABILITY_PHASES[capability.key] ?? 'p0'} />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {t(`admin.dataCenter.overview.capabilities.${capability.key}.description`, '')}
                  </p>
                </div>
              </>
            );
            const className = 'flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-white/5 dark:bg-white/5';
            return (
              <li key={capability.key}>
                {capability.route ? (
                  <Link className={`${className} transition-colors hover:border-lobster-200`} to={capability.route}>
                    {content}
                  </Link>
                ) : (
                  <div className={`${className} opacity-80`}>{content}</div>
                )}
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
