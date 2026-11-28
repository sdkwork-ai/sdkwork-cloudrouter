import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataCenterService, type DataCenterExportSummary } from '../dataCenterService.ts';
import { useDataCenterQuery } from '../dataCenterHooks.ts';
import {
  DataCenterPageHeader,
  DataCenterReadOnlyBadge,
  DataCenterTable,
  type DataCenterColumn,
} from '../components/DataCenterShell.tsx';

const STATUS_TONE: Record<DataCenterExportSummary['status'], string> = {
  pending_approval: 'text-amber-600 dark:text-amber-400',
  running: 'text-sky-600 dark:text-sky-400',
  succeeded: 'text-emerald-600 dark:text-emerald-400',
  failed: 'text-red-600 dark:text-red-400',
  expired: 'text-slate-500 dark:text-slate-400',
};

export function DataCenterExportsPage() {
  const { t } = useTranslation();
  const load = useCallback(() => DataCenterService.listExports(), []);
  const state = useDataCenterQuery(load);

  const columns: readonly DataCenterColumn<DataCenterExportSummary>[] = [
    {
      key: 'dataset',
      label: t('admin.dataCenter.exports.columns.dataset', 'Dataset'),
      render: (row) => <span className="font-medium">{row.datasetName}</span>,
    },
    {
      key: 'status',
      label: t('admin.dataCenter.exports.columns.status', 'Status'),
      render: (row) => (
        <span className={`text-xs font-medium ${STATUS_TONE[row.status]}`}>
          {t(`admin.dataCenter.exports.status.${row.status}`, row.status)}
        </span>
      ),
    },
    {
      key: 'rows',
      label: t('admin.dataCenter.exports.columns.rows', 'Rows'),
      align: 'right',
      render: (row) => row.rowCount,
    },
    {
      key: 'requester',
      label: t('admin.dataCenter.exports.columns.requester', 'Requested by'),
      render: (row) => row.requestedBy || '—',
    },
    {
      key: 'expires',
      label: t('admin.dataCenter.exports.columns.expires', 'Link expires'),
      render: (row) => row.expiresAt ?? '—',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataCenterPageHeader
        title={t('admin.dataCenter.exports.title', 'Export Center')}
        description={t(
          'admin.dataCenter.exports.description',
          'Governed data delivery: request, approve, generate, then download through a single-use signed link with a watermark and an expiry date. Every download is audited.',
        )}
        actions={(
          <DataCenterReadOnlyBadge
            reason={t(
              'admin.dataCenter.exports.readOnlyReason',
              'Requesting and approving exports from the console is not part of this release.',
            )}
          />
        )}
      />

      <DataCenterTable
        columns={columns}
        emptyDescription={t(
          'admin.dataCenter.exports.empty.description',
          'Exports are created from a dataset and carry a field whitelist, a purpose and an expiry.',
        )}
        emptyTitle={t('admin.dataCenter.exports.empty.title', 'No export jobs yet')}
        loadingLabel={t('admin.dataCenter.loading', 'Loading…')}
        onRetry={() => void load()}
        state={state}
      />
    </div>
  );
}
