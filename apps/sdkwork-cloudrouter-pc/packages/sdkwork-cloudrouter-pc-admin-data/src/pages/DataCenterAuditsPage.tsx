import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataCenterService, type DataCenterAuditSummary } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterPageHeader,
  DataCenterPendingNotice,
  DataCenterTable,
  type DataCenterColumn,
} from '../components/DataCenterShell.tsx';

export function DataCenterAuditsPage() {
  const { t } = useTranslation();
  const load = useCallback(() => DataCenterService.listAudits(), []);
  const state = useDataCenterQuery(load);

  const columns: readonly DataCenterColumn<DataCenterAuditSummary>[] = [
    {
      key: 'at',
      label: t('admin.dataCenter.audits.columns.at', 'Time'),
      render: (row) => <span className="tabular-nums text-xs">{row.at}</span>,
    },
    {
      key: 'actor',
      label: t('admin.dataCenter.audits.columns.actor', 'Actor'),
      render: (row) => row.actor,
    },
    {
      key: 'action',
      label: t('admin.dataCenter.audits.columns.action', 'Action'),
      render: (row) => (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {t(`admin.dataCenter.audits.action.${row.action}`, row.action)}
        </span>
      ),
    },
    {
      key: 'object',
      label: t('admin.dataCenter.audits.columns.object', 'Object'),
      render: (row) => <span className="font-mono text-xs">{row.object}</span>,
    },
    {
      key: 'rows',
      label: t('admin.dataCenter.audits.columns.rows', 'Rows'),
      align: 'right',
      render: (row) => row.rowCount,
    },
    {
      key: 'result',
      label: t('admin.dataCenter.audits.columns.result', 'Result'),
      render: (row) => (
        <span className={row.result === 'success'
          ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
          : 'text-xs font-medium text-red-600 dark:text-red-400'}
        >
          {t(`admin.dataCenter.audits.result.${row.result}`, row.result)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataCenterPageHeader
        title={t('admin.dataCenter.audits.title', 'Access Audit')}
        description={t(
          'admin.dataCenter.audits.description',
          'Every connect, query, download, DDL, DML, publish and approval lands here with actor, object, row count and trace id.',
        )}
      />

      <DataCenterPendingNotice />

      <DataCenterTable
        columns={columns}
        emptyDescription={t(
          'admin.dataCenter.audits.empty.description',
          'Audit events appear as soon as the datacenter service handles its first request.',
        )}
        emptyTitle={t('admin.dataCenter.audits.empty.title', 'No audit events yet')}
        loadingLabel={t('admin.dataCenter.loading', 'Loading…')}
        state={state}
      />
    </div>
  );
}
