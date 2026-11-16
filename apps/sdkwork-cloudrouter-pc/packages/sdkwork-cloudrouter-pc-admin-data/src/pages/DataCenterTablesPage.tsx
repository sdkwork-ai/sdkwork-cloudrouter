import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataCenterService, type DataCenterTableSummary } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterPageHeader,
  DataCenterPendingNotice,
  DataCenterTable,
  type DataCenterColumn,
} from '../components/DataCenterShell.tsx';

export function DataCenterTablesPage() {
  const { t } = useTranslation();
  const load = useCallback(() => DataCenterService.listTables(), []);
  const state = useDataCenterQuery(load);

  const columns: readonly DataCenterColumn<DataCenterTableSummary>[] = [
    {
      key: 'name',
      label: t('admin.dataCenter.tables.columns.name', 'Table'),
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'kind',
      label: t('admin.dataCenter.tables.columns.kind', 'Type'),
      render: (row) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {t(`admin.dataCenter.tables.kind.${row.kind}`, row.kind)}
        </span>
      ),
    },
    {
      key: 'rows',
      label: t('admin.dataCenter.tables.columns.rows', 'Rows'),
      align: 'right',
      render: (row) => row.rowCount,
    },
    {
      key: 'columns',
      label: t('admin.dataCenter.tables.columns.columns', 'Columns'),
      align: 'right',
      render: (row) => row.columnCount,
    },
    {
      key: 'owner',
      label: t('admin.dataCenter.tables.columns.owner', 'Owner'),
      render: (row) => row.owner,
    },
    {
      key: 'updatedAt',
      label: t('admin.dataCenter.tables.columns.updatedAt', 'Updated'),
      render: (row) => row.updatedAt,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataCenterPageHeader
        title={t('admin.dataCenter.tables.title', 'Data Tables')}
        description={t(
          'admin.dataCenter.tables.description',
          'Landed tables live in the dedicated dc_data schema. External tables stay read-only; only landed tables expose row-level maintenance with batch snapshots and rollback.',
        )}
      />

      <DataCenterPendingNotice />

      <DataCenterTable
        columns={columns}
        emptyDescription={t(
          'admin.dataCenter.tables.empty.description',
          'Run a sync pipeline or import a file to create the first landed table.',
        )}
        emptyTitle={t('admin.dataCenter.tables.empty.title', 'No tables yet')}
        loadingLabel={t('admin.dataCenter.loading', 'Loading…')}
        state={state}
      />
    </div>
  );
}
