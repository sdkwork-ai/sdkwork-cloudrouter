import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { DataCenterService, type DataCenterSourceSummary } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterPageHeader,
  DataCenterReadOnlyBadge,
  DataCenterTable,
  type DataCenterColumn,
} from '../components/DataCenterShell.tsx';

const SUPPORTED_SOURCE_KINDS = ['postgresql', 'mysql', 'platform', 'file'] as const;

const HEALTH_TONE: Record<DataCenterSourceSummary['health'], string> = {
  healthy: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  unknown: 'text-slate-500 dark:text-slate-400',
};

export function DataCenterSourcesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const load = useCallback(() => DataCenterService.listSources(), []);
  const state = useDataCenterQuery(load);

  const visibleState = useMemo(() => {
    if (state.phase !== 'ready') {
      return state;
    }
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return state;
    }
    return {
      phase: 'ready' as const,
      data: state.data.filter((source) => (
        source.name.toLowerCase().includes(keyword) || source.kind.toLowerCase().includes(keyword)
      )),
    };
  }, [search, state]);

  const columns: readonly DataCenterColumn<DataCenterSourceSummary>[] = [
    {
      key: 'name',
      label: t('admin.dataCenter.sources.columns.name', 'Source'),
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'kind',
      label: t('admin.dataCenter.sources.columns.kind', 'Type'),
      render: (row) => <span className="text-xs uppercase text-slate-500 dark:text-slate-400">{row.kind}</span>,
    },
    {
      key: 'health',
      label: t('admin.dataCenter.sources.columns.status', 'Health'),
      render: (row) => (
        <span className={`text-xs font-medium ${HEALTH_TONE[row.health]}`}>
          {t(`admin.dataCenter.sources.health.${row.health}`, row.health)}
        </span>
      ),
    },
    {
      key: 'tables',
      label: t('admin.dataCenter.sources.columns.tables', 'Tables'),
      align: 'right',
      render: (row) => String(row.tableCount),
    },
    {
      key: 'lastTestedAt',
      label: t('admin.dataCenter.sources.columns.lastTestedAt', 'Last test'),
      render: (row) => row.lastTestedAt ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataCenterPageHeader
        title={t('admin.dataCenter.sources.title', 'Data Sources')}
        description={t(
          'admin.dataCenter.sources.description',
          'Connect platform databases, external databases and uploaded files. Credentials are write-only, and every source must pass a connection test before it can be referenced.',
        )}
        actions={(
          <DataCenterReadOnlyBadge
            reason={t(
              'admin.dataCenter.sources.readOnlyReason',
              'Creating and testing sources from the console is not part of this release.',
            )}
          />
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.dataCenter.sources.kinds.title', 'Supported connectors')}:
          </span>
          {SUPPORTED_SOURCE_KINDS.map((kind) => (
            <span
              key={kind}
              className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium uppercase text-slate-600 dark:border-white/10 dark:text-slate-300"
            >
              {kind}
            </span>
          ))}
        </div>
        <label className="relative flex items-center">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            aria-label={t('admin.dataCenter.sources.searchPlaceholder', 'Search sources')}
            className="h-8 w-64 rounded-md border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-lobster-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.dataCenter.sources.searchPlaceholder', 'Search sources')}
            type="search"
            value={search}
          />
        </label>
      </div>

      <DataCenterTable
        columns={columns}
        emptyDescription={t(
          'admin.dataCenter.sources.empty.description',
          'Connect a source to start landing tables. Nothing is created automatically.',
        )}
        emptyTitle={t('admin.dataCenter.sources.empty.title', 'No data sources yet')}
        loadingLabel={t('admin.dataCenter.loading', 'Loading…')}
        onRetry={() => void load()}
        state={visibleState}
      />
    </div>
  );
}
