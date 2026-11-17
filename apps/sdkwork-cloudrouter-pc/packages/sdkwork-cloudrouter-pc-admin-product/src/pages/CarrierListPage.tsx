import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Truck } from 'lucide-react';

import {
  Button,
  Notice,
  StatusBadge,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import {
  ResourcePageFrame,
  requireString,
  type ProductCenterPageProps,
  type ResourceQueryState,
} from './resourcePage.tsx';
import {
  getProductCenterService,
  type CarrierSummary,
  type CreateCarrierRequest,
  type ProductCenterService,
  type UpdateCarrierRequest,
} from '../productCenterService.ts';

const CARRIER_STATUSES = ['active', 'inactive'] as const;

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalSortOrder(values: Record<string, string | boolean>): number | undefined {
  const value = values.sortOrder;
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : undefined;
}

interface CarrierFormDialogProps {
  service: ProductCenterService;
  carrier: CarrierSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Create / edit dialog for one carrier.
 *
 * The carrier code is the natural key the shipment already stores, so it is
 * immutable after creation; every other field (display name, tracking URL
 * template, ordering, enablement) stays editable.
 */
function CarrierFormDialog({ service, carrier, onClose, onSaved }: CarrierFormDialogProps) {
  const { t } = useTranslation();
  const creating = carrier === null;

  const fields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'carrierCode',
      label: t('admin.productCenter.carriers.field.code', 'Carrier code'),
      kind: 'text',
      required: true,
      readOnly: !creating,
      help: creating
        ? t('admin.productCenter.carriers.field.codeHint', 'Lower-case code stored on the shipment, for example sf or dhl.')
        : undefined,
    },
    {
      name: 'carrierName',
      label: t('admin.productCenter.carriers.field.name', 'Carrier name'),
      kind: 'text',
      required: true,
    },
    {
      name: 'trackingUrlTemplate',
      label: t('admin.productCenter.carriers.field.trackingUrl', 'Tracking URL template'),
      kind: 'text',
      help: t('admin.productCenter.carriers.field.trackingUrlHint', 'Use {trackingNo} where the tracking number belongs.'),
    },
    { name: 'sortOrder', label: t('admin.productCenter.carriers.field.sortOrder', 'Sort order'), kind: 'number' },
    {
      name: 'status',
      label: t('admin.productCenter.carriers.field.status', 'Status'),
      kind: 'select',
      options: CARRIER_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [creating, t]);

  return (
    <RecordFormDialog
      fields={fields}
      initialValues={carrier
        ? {
          carrierCode: carrier.carrierCode,
          carrierName: carrier.carrierName,
          trackingUrlTemplate: carrier.trackingUrlTemplate ?? '',
          sortOrder: String(carrier.sortOrder),
          status: carrier.status,
        }
        : { status: 'active' }}
      onClose={onClose}
      onSubmit={(values) => {
        const body = {
          carrierName: requireString(values, 'carrierName'),
          ...(optionalString(values, 'trackingUrlTemplate')
            ? { trackingUrlTemplate: optionalString(values, 'trackingUrlTemplate') }
            : {}),
          ...(optionalSortOrder(values) !== undefined ? { sortOrder: optionalSortOrder(values) } : {}),
          status: values.status === 'inactive' ? 'inactive' : 'active',
        };
        const request = creating
          ? service.createCarrier({
            carrierCode: requireString(values, 'carrierCode').toLowerCase(),
            ...body,
          } satisfies CreateCarrierRequest)
          : service.updateCarrier(carrier.carrierId, body satisfies UpdateCarrierRequest);
        return request.then(() => {
          onSaved();
        });
      }}
      open
      title={creating
        ? t('admin.productCenter.carriers.createTitle', 'Create carrier')
        : t('admin.productCenter.carriers.editTitle', 'Edit carrier')}
    />
  );
}

export function CarrierListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ carrier: CarrierSummary | null } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback((query: ResourceQueryState) => resolved.listCarriers({
    page: query.page,
    pageSize: query.pageSize,
    ...(query.filters.status ? { status: query.filters.status } : {}),
  }), [resolved]);

  const columns = useMemo<DataColumn<CarrierSummary>[]>(() => [
    {
      key: 'carrierCode',
      header: t('admin.productCenter.carriers.column.code', 'Code'),
      cell: (row) => <span className="font-mono text-xs uppercase">{row.carrierCode}</span>,
    },
    {
      key: 'carrierName',
      header: t('admin.productCenter.carriers.column.name', 'Carrier'),
      cell: (row) => (
        <span className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <Truck aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
          {row.carrierName}
        </span>
      ),
    },
    {
      key: 'trackingUrlTemplate',
      header: t('admin.productCenter.carriers.column.trackingUrl', 'Tracking URL template'),
      cell: (row) => (row.trackingUrlTemplate
        ? <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.trackingUrlTemplate}</span>
        : <span className="text-slate-400">—</span>),
    },
    {
      key: 'sortOrder',
      header: t('admin.productCenter.carriers.column.sortOrder', 'Sort'),
      cell: (row) => <span className="tabular-nums">{row.sortOrder}</span>,
    },
    {
      key: 'status',
      header: t('admin.productCenter.carriers.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [t]);

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'status',
      label: t('admin.productCenter.carriers.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...CARRIER_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  return (
    <>
      {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
      <ResourcePageFrame<CarrierSummary>
        columns={columns}
        description={t('admin.productCenter.carriers.description', 'Carrier registry used by shipments and the logistics tracking board.')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        key={reloadToken}
        load={load}
        rowActions={(row) => (
          <Button onClick={() => setDialog({ carrier: row })} variant="ghost">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.edit', 'Edit')}
          </Button>
        )}
        rowKey={(row) => row.carrierId}
        title={t('admin.productCenter.carriers.title', 'Carriers')}
        toolbarActions={
          <Button onClick={() => setDialog({ carrier: null })} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.carriers.createTitle', 'Create carrier')}
          </Button>
        }
      />

      {dialog ? (
        <CarrierFormDialog
          carrier={dialog.carrier}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            setNotice(t('admin.productCenter.toast.saved', 'Saved'));
            setReloadToken((token) => token + 1);
          }}
          service={resolved}
        />
      ) : null}
    </>
  );
}
