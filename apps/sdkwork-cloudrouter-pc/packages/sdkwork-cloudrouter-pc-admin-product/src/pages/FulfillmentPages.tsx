import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, RefreshCw, Route, Truck } from 'lucide-react';

import {
  Button,
  DataTable,
  Dialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  StatusBadge,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { ResourcePageFrame, requireString, type ProductCenterPageProps } from './resourcePage.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type CarrierSummary,
  type FulfillmentSummary,
  type ProductCenterService,
  type ShipmentPackageSummary,
  type ShipmentSummary,
  type ShipmentTrackingEventSummary,
} from '../productCenterService.ts';

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function usePackageFields(): FormFieldSpec[] {
  const { t } = useTranslation();
  return useMemo<FormFieldSpec[]>(() => [
    {
      name: 'packageType',
      label: t('admin.productCenter.shipments.package.field.packageType', 'Package type'),
      kind: 'text',
      required: true,
    },
    {
      name: 'trackingNo',
      label: t('admin.productCenter.shipments.package.field.trackingNo', 'Tracking no.'),
      kind: 'text',
    },
    {
      name: 'status',
      label: t('admin.productCenter.shipments.package.field.status', 'Status'),
      kind: 'text',
    },
  ], [t]);
}

interface ShipmentPackagesDialogProps {
  shipment: ShipmentSummary;
  service: ProductCenterService;
  onClose: () => void;
}

/**
 * Shipment package registry.
 *
 * A shipment can carry several physical packages; the order module owns the
 * package aggregate and its `package_no`/`tracking_no` uniqueness rules, so the
 * dialog only lists and submits the documented create/update operations.
 */
function ShipmentPackagesDialog({ shipment, service, onClose }: ShipmentPackagesDialogProps) {
  const { t } = useTranslation();
  const fields = usePackageFields();
  const [items, setItems] = useState<ShipmentPackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ShipmentPackageSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    service.listShipmentPackages(shipment.shipmentId, { page: 1, pageSize: 50 }).then(
      (result) => {
        setItems(result.items);
        setLoading(false);
      },
      (loadError: unknown) => {
        setItems([]);
        setError(describeProductCenterError(loadError).message);
        setLoading(false);
      },
    );
  }, [service, shipment.shipmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const columns = useMemo<DataColumn<ShipmentPackageSummary>[]>(() => [
    {
      key: 'packageNo',
      header: t('admin.productCenter.shipments.package.column.packageNo', 'Package no.'),
      cell: (row) => <span className="font-mono text-xs">{row.packageNo}</span>,
    },
    {
      key: 'type',
      header: t('admin.productCenter.shipments.package.column.type', 'Package type'),
      cell: (row) => row.packageType,
    },
    {
      key: 'tracking',
      header: t('admin.productCenter.shipments.package.column.trackingNo', 'Tracking no.'),
      cell: (row) => row.trackingNo ?? t('admin.productCenter.logistics.missingTracking', 'Tracking number pending'),
    },
    {
      key: 'status',
      header: t('admin.productCenter.shipments.package.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'actions',
      header: t('admin.productCenter.common.actions', 'Actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <Button onClick={() => setEditing(row)} variant="ghost">
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.productCenter.actions.edit', 'Edit')}
        </Button>
      ),
    },
  ], [t]);

  return (
    <Dialog
      onClose={onClose}
      open
      title={`${t('admin.productCenter.shipments.packagesTitle', 'Packages')} · ${shipment.shipmentNo}`}
      wide
    >
      <div className="flex flex-col gap-3">
        {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {shipment.carrierCode} · {shipment.trackingNo ?? t('admin.productCenter.logistics.missingTracking', 'Tracking number pending')}
          </p>
          <Button onClick={() => setCreating(true)} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.shipments.package.createTitle', 'Register package')}
          </Button>
        </div>
        {loading ? (
          <LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} />
        ) : error ? (
          <ErrorState
            codeLabel={t('admin.productCenter.error.code', 'Error code')}
            message={error}
            onRetry={reload}
            retryLabel={t('admin.productCenter.actions.retry', 'Retry')}
            title={t('admin.productCenter.state.error', 'The request failed')}
            traceLabel={t('admin.productCenter.error.traceId', 'Trace id')}
          />
        ) : (
          <DataTable
            columns={columns}
            emptyLabel={t('admin.productCenter.shipments.package.empty', 'No package registered yet')}
            rowKey={(row) => row.packageId}
            rows={items}
          />
        )}
      </div>

      <RecordFormDialog
        fields={fields}
        initialValues={{}}
        onClose={() => setCreating(false)}
        onSubmit={(values) => service.createShipmentPackage(shipment.shipmentId, {
          packageType: requireString(values, 'packageType'),
          ...(optionalString(values, 'trackingNo') ? { trackingNo: optionalString(values, 'trackingNo') } : {}),
          ...(optionalString(values, 'status') ? { status: optionalString(values, 'status') } : {}),
        }).then(() => {
          setNotice(t('admin.productCenter.toast.created', 'Created'));
          reload();
        })}
        open={creating}
        title={t('admin.productCenter.shipments.package.createTitle', 'Register package')}
      />

      <RecordFormDialog
        fields={fields}
        initialValues={editing ? {
          packageType: editing.packageType,
          trackingNo: editing.trackingNo ?? '',
          status: editing.status,
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          return service.updateShipmentPackage(shipment.shipmentId, editing.packageId, {
            packageType: requireString(values, 'packageType'),
            ...(optionalString(values, 'trackingNo') ? { trackingNo: optionalString(values, 'trackingNo') } : {}),
            ...(optionalString(values, 'status') ? { status: optionalString(values, 'status') } : {}),
          }).then(() => {
            setNotice(t('admin.productCenter.toast.saved', 'Saved'));
            reload();
          });
        }}
        open={editing !== null}
        title={t('admin.productCenter.shipments.package.editTitle', 'Edit package')}
      />
    </Dialog>
  );
}

const TRACKING_EVENT_TYPES = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception'] as const;
/** Upper bound for one timeline query; a longer shipment is truncated on purpose. */
const TRACKING_EVENT_LIMIT = 1000;

interface ShipmentTrackingDialogProps {
  shipment: ShipmentSummary;
  service: ProductCenterService;
  onClose: () => void;
}

/**
 * Carrier tracking timeline of one shipment.
 *
 * Events are append-only on the order backend; the dialog records the carrier
 * scan verbatim (type, status, time, location) and replays them in occurrence
 * order, so an operator can answer "where is this parcel" without leaving the
 * Product Center.
 */
function ShipmentTrackingDialog({ shipment, service, onClose }: ShipmentTrackingDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ShipmentTrackingEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const loadAllEvents = async (): Promise<ShipmentTrackingEventSummary[]> => {
      const collected: ShipmentTrackingEventSummary[] = [];
      let page = 1;
      for (;;) {
        const result = await service.listShipmentTrackingEvents({
          shipmentId: shipment.shipmentId,
          page,
          pageSize: 200,
        });
        collected.push(...result.items);
        // The timeline is append-only and usually short, but a long-running
        // shipment must not lose its early carrier scans to the first page.
        if (!result.pageInfo.hasNextPage || collected.length >= TRACKING_EVENT_LIMIT) {
          return collected;
        }
        page += 1;
      }
    };
    loadAllEvents().then(
      (events) => {
        if (active) {
          setItems(events);
          setLoading(false);
        }
      },
      (loadError: unknown) => {
        if (active) {
          setItems([]);
          setError(describeProductCenterError(loadError).message);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [reloadToken, service, shipment.shipmentId]);

  const fields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'eventType',
      label: t('admin.productCenter.tracking.eventType', 'Event type'),
      kind: 'select',
      options: TRACKING_EVENT_TYPES.map((value) => ({
        value,
        label: t(`admin.productCenter.tracking.type.${value}`, value),
      })),
    },
    {
      name: 'eventStatus',
      label: t('admin.productCenter.tracking.eventStatus', 'Event status'),
      kind: 'text',
    },
    {
      name: 'eventTime',
      label: t('admin.productCenter.tracking.eventTime', 'Event time'),
      kind: 'text',
      help: t('admin.productCenter.tracking.eventTimeHint', 'ISO-8601 instant; leave blank to use the server time.'),
    },
    {
      name: 'locationText',
      label: t('admin.productCenter.tracking.location', 'Location'),
      kind: 'text',
    },
  ], [t]);

  return (
    <Dialog
      footer={
        <Button onClick={onClose} variant="secondary">
          {t('admin.productCenter.actions.close', 'Close')}
        </Button>
      }
      onClose={onClose}
      open
      title={`${t('admin.productCenter.tracking.title', 'Tracking timeline')} · ${shipment.shipmentNo}`}
      wide
    >
      <div className="flex flex-col gap-3">
        {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {shipment.carrierCode} · {shipment.trackingNo ?? t('admin.productCenter.logistics.missingTracking', 'Tracking number pending')}
          </p>
          <Button onClick={() => setCreating(true)} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.tracking.createTitle', 'Record tracking event')}
          </Button>
        </div>
        {loading ? (
          <LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.tracking.empty', 'No tracking event yet')}
          </p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l border-slate-200 pl-4 dark:border-white/10">
            {items.map((event) => (
              <li className="relative" key={event.eventId}>
                <span
                  aria-hidden="true"
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-lobster-500"
                />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {t(`admin.productCenter.tracking.type.${event.eventType}`, event.eventType)}
                  </span>
                  {event.eventStatus ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {event.eventStatus}
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-500 dark:text-slate-400">{event.eventTime}</span>
                </div>
                {event.locationText ? (
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.locationText}</div>
                ) : null}
                <div className="mt-0.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  {event.trackingEventNo}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <RecordFormDialog
        fields={fields}
        initialValues={{}}
        onClose={() => setCreating(false)}
        onSubmit={(values) => {
          const eventType = typeof values.eventType === 'string' && values.eventType
            ? values.eventType
            : 'in_transit';
          return service.createShipmentTrackingEvent(shipment.shipmentId, {
            eventType,
            ...(optionalString(values, 'eventStatus') ? { eventStatus: optionalString(values, 'eventStatus') } : {}),
            ...(optionalString(values, 'eventTime') ? { eventTime: optionalString(values, 'eventTime') } : {}),
            ...(optionalString(values, 'locationText') ? { locationText: optionalString(values, 'locationText') } : {}),
          }).then(() => {
            setNotice(t('admin.productCenter.tracking.created', 'Tracking event recorded'));
            setReloadToken((token) => token + 1);
          });
        }}
        open={creating}
        title={t('admin.productCenter.tracking.createTitle', 'Record tracking event')}
      />
    </Dialog>
  );
}

export function ShipmentListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [activeShipment, setActiveShipment] = useState<ShipmentSummary | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<ShipmentSummary | null>(null);
  const [fulfillments, setFulfillments] = useState<readonly FulfillmentSummary[]>([]);
  const [carriers, setCarriers] = useState<readonly CarrierSummary[]>([]);

  useEffect(() => {
    let active = true;
    resolved.listFulfillments({ page: 1, pageSize: 200 }).then(
      (page) => {
        if (active) {
          setFulfillments(page.items);
        }
      },
      () => {
        if (active) {
          setFulfillments([]);
        }
      },
    );
    resolved.listCarriers({ page: 1, pageSize: 200 }).then(
      (page) => {
        if (active) {
          setCarriers(page.items);
        }
      },
      () => {
        if (active) {
          setCarriers([]);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [resolved]);

  const fulfillmentOptions = useMemo(
    () => fulfillments.map((fulfillment) => ({
      value: fulfillment.fulfillmentId,
      label: `${fulfillment.fulfillmentNo} · ${fulfillment.orderId}`,
    })),
    [fulfillments],
  );
  const carrierOptions = useMemo(
    () => carriers.map((carrier) => ({
      value: carrier.carrierCode,
      label: `${carrier.carrierName} (${carrier.carrierCode})`,
    })),
    [carriers],
  );
  const fulfillmentById = useMemo(
    () => new Map(fulfillments.map((fulfillment) => [fulfillment.fulfillmentId, fulfillment])),
    [fulfillments],
  );
  const carrierByCode = useMemo(
    () => new Map(carriers.map((carrier) => [carrier.carrierCode, carrier])),
    [carriers],
  );

  const filters = useMemo<FilterControl[]>(() => [
    { name: 'status', label: t('admin.productCenter.shipments.filter.status', 'Status'), kind: 'text' },
    { name: 'orderId', label: t('admin.productCenter.shipments.filter.order', 'Order id'), kind: 'text' },
    { name: 'fulfillmentId', label: t('admin.productCenter.shipments.filter.fulfillment', 'Fulfillment id'), kind: 'text' },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listShipments({
        page: query.page,
        pageSize: query.pageSize,
        status: query.filters.status || undefined,
        orderId: query.filters.orderId || undefined,
        fulfillmentId: query.filters.fulfillmentId || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<ShipmentSummary>[]>(() => [
    {
      key: 'shipmentNo',
      header: t('admin.productCenter.shipments.column.shipmentNo', 'Shipment no.'),
      cell: (row) => <span className="font-mono text-xs">{row.shipmentNo}</span>,
    },
    {
      key: 'fulfillmentId',
      header: t('admin.productCenter.shipments.column.fulfillmentId', 'Fulfillment id'),
      cell: (row) => {
        const fulfillment = fulfillmentById.get(row.fulfillmentId);
        return fulfillment
          ? <span className="text-xs">{fulfillment.fulfillmentNo}</span>
          : <span className="font-mono text-xs">{row.fulfillmentId}</span>;
      },
    },
    {
      key: 'carrier',
      header: t('admin.productCenter.shipments.column.carrier', 'Carrier'),
      cell: (row) => {
        const carrier = carrierByCode.get(row.carrierCode);
        return carrier ? `${carrier.carrierName} (${row.carrierCode})` : row.carrierCode;
      },
    },
    {
      key: 'trackingNo',
      header: t('admin.productCenter.shipments.column.trackingNo', 'Tracking no.'),
      cell: (row) => (row.trackingNo
        ? <span className="font-mono text-xs">{row.trackingNo}</span>
        : <span className="text-amber-600 dark:text-amber-400">{t('admin.productCenter.logistics.missingTracking', 'Tracking number pending')}</span>),
    },
    {
      key: 'status',
      header: t('admin.productCenter.shipments.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [carrierByCode, fulfillmentById, t]);

  return (
    <>
      <ResourcePageFrame<ShipmentSummary>
        columns={columns}
        create={{
          label: t('admin.productCenter.actions.create', 'Create'),
          title: t('admin.productCenter.shipments.createTitle', 'Create shipment'),
          fields: [
            fulfillmentOptions.length > 0
              ? {
                name: 'fulfillmentId',
                label: t('admin.productCenter.shipments.createField.fulfillment', 'Fulfillment'),
                kind: 'select' as const,
                required: true,
                options: fulfillmentOptions,
              }
              : {
                name: 'fulfillmentId',
                label: t('admin.productCenter.shipments.createField.fulfillmentId', 'Fulfillment id'),
                kind: 'text' as const,
                required: true,
                help: t('admin.productCenter.shipments.createField.fulfillmentHint', 'No fulfillment list was available; enter the fulfillment id.'),
              },
            carrierOptions.length > 0
              ? {
                name: 'carrierCode',
                label: t('admin.productCenter.shipments.createField.carrier', 'Carrier'),
                kind: 'select' as const,
                required: true,
                options: carrierOptions,
              }
              : {
                name: 'carrierCode',
                label: t('admin.productCenter.shipments.createField.carrierCode', 'Carrier code'),
                kind: 'text' as const,
                required: true,
                help: t('admin.productCenter.shipments.createField.carrierHint', 'No carrier registry entry was available; enter the carrier code.'),
              },
            {
              name: 'trackingNo',
              label: t('admin.productCenter.shipments.createField.trackingNo', 'Tracking no.'),
              kind: 'text' as const,
            },
          ],
          onSubmit: (values) => resolved.createShipment({
            fulfillmentId: requireString(values, 'fulfillmentId'),
            carrierCode: requireString(values, 'carrierCode'),
            ...(optionalString(values, 'trackingNo') ? { trackingNo: optionalString(values, 'trackingNo') } : {}),
          }).then(() => undefined),
        }}
        description={t('admin.productCenter.shipments.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row) => (
          <>
            <Button onClick={() => setActiveShipment(row)} variant="ghost">
              <Truck aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.managePackages', 'Packages')}
            </Button>
            <Button onClick={() => setTrackingShipment(row)} variant="ghost">
              <Route aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.shipments.action.tracking', 'Tracking')}
            </Button>
          </>
        )}
        rowKey={(row) => row.shipmentId}
        title={t('admin.productCenter.shipments.title', 'Shipments')}
      />

      {activeShipment ? (
        <ShipmentPackagesDialog
          onClose={() => setActiveShipment(null)}
          service={resolved}
          shipment={activeShipment}
        />
      ) : null}

      {trackingShipment ? (
        <ShipmentTrackingDialog
          onClose={() => setTrackingShipment(null)}
          service={resolved}
          shipment={trackingShipment}
        />
      ) : null}
    </>
  );
}

interface CarrierGroup {
  carrierCode: string;
  shipments: ShipmentSummary[];
}

export function LogisticsTrackingPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [shipments, setShipments] = useState<ShipmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackingShipment, setTrackingShipment] = useState<ShipmentSummary | null>(null);
  const [carrierNames, setCarrierNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    resolved.listCarriers({ page: 1, pageSize: 200 }).then(
      (page) => {
        if (!active) {
          return;
        }
        const names: Record<string, string> = {};
        for (const carrier of page.items) {
          names[carrier.carrierCode] = carrier.carrierName;
        }
        setCarrierNames(names);
      },
      () => {
        // The registry is a presentation aid; a missing registry must not hide
        // the shipments themselves.
        if (active) {
          setCarrierNames({});
        }
      },
    );
    return () => {
      active = false;
    };
  }, [resolved]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    resolved.listShipments({
      page: 1,
      pageSize: 100,
      ...(statusFilter ? { status: statusFilter } : {}),
    }).then(
      (result) => {
        if (!active) {
          return;
        }
        setShipments(result.items);
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!active) {
          return;
        }
        setShipments([]);
        setError(describeProductCenterError(loadError).message);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [reloadToken, resolved, statusFilter]);

  const groups = useMemo<CarrierGroup[]>(() => {
    const byCarrier = new Map<string, ShipmentSummary[]>();
    for (const shipment of shipments) {
      const key = shipment.carrierCode || '';
      const current = byCarrier.get(key) ?? [];
      current.push(shipment);
      byCarrier.set(key, current);
    }
    return [...byCarrier.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([carrierCode, carrierShipments]) => ({ carrierCode, shipments: carrierShipments }));
  }, [shipments]);

  const carrierLabel = (carrierCode: string): string => {
    if (!carrierCode) {
      return t('admin.productCenter.logistics.groupUnassigned', 'Carrier not assigned');
    }
    const name = carrierNames[carrierCode];
    return name ? `${name} (${carrierCode})` : carrierCode;
  };

  const withTracking = shipments.filter((shipment) => Boolean(shipment.trackingNo)).length;
  const pendingTracking = shipments.length - withTracking;

  const columns = useMemo<DataColumn<ShipmentSummary>[]>(() => [
    {
      key: 'shipmentNo',
      header: t('admin.productCenter.shipments.column.shipmentNo', 'Shipment no.'),
      cell: (row) => <span className="font-mono text-xs">{row.shipmentNo}</span>,
    },
    {
      key: 'fulfillmentId',
      header: t('admin.productCenter.shipments.column.fulfillmentId', 'Fulfillment id'),
      cell: (row) => <span className="font-mono text-xs">{row.fulfillmentId}</span>,
    },
    {
      key: 'trackingNo',
      header: t('admin.productCenter.shipments.column.trackingNo', 'Tracking no.'),
      cell: (row) => (row.trackingNo
        ? <span className="font-mono text-xs">{row.trackingNo}</span>
        : <span className="text-amber-600 dark:text-amber-400">{t('admin.productCenter.logistics.missingTracking', 'Tracking number pending')}</span>),
    },
    {
      key: 'status',
      header: t('admin.productCenter.shipments.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'actions',
      header: t('admin.productCenter.common.actions', 'Actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <Button onClick={() => setTrackingShipment(row)} variant="ghost">
          <Route aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.productCenter.shipments.action.tracking', 'Tracking')}
        </Button>
      ),
    },
  ], [t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <>
            <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{t('admin.productCenter.shipments.filter.status', 'Status')}</span>
              <input
                className="h-8 w-32 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                onChange={(event) => setStatusFilter(event.target.value)}
                value={statusFilter}
              />
            </label>
            <Button onClick={() => setReloadToken((token) => token + 1)} variant="secondary">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.refresh', 'Refresh')}
            </Button>
          </>
        }
        description={t('admin.productCenter.logistics.description', '')}
        title={t('admin.productCenter.logistics.title', 'Logistics Tracking')}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            key: 'shipments',
            label: t('admin.productCenter.logistics.summary.shipments', 'Shipments in view'),
            value: shipments.length,
          },
          {
            key: 'withTracking',
            label: t('admin.productCenter.logistics.summary.withTracking', 'With tracking number'),
            value: withTracking,
          },
          {
            key: 'pendingTracking',
            label: t('admin.productCenter.logistics.summary.pendingTracking', 'Missing tracking number'),
            value: pendingTracking,
          },
        ].map((metric) => (
          <div
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#171717]"
            key={metric.key}
          >
            <div className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <Panel><LoadingState label={t('admin.productCenter.state.loading', 'Loading…')} /></Panel>
      ) : error ? (
        <Panel>
          <ErrorState
            codeLabel={t('admin.productCenter.error.code', 'Error code')}
            message={error}
            onRetry={() => setReloadToken((token) => token + 1)}
            retryLabel={t('admin.productCenter.actions.retry', 'Retry')}
            title={t('admin.productCenter.state.error', 'The request failed')}
            traceLabel={t('admin.productCenter.error.traceId', 'Trace id')}
          />
        </Panel>
      ) : groups.length === 0 ? (
        <Panel>
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.state.empty', 'No records yet')}
          </p>
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel
            key={group.carrierCode || 'unassigned'}
            title={`${t('admin.productCenter.logistics.groupCarrier', 'Carrier')}: ${carrierLabel(group.carrierCode)}`}
          >
            <DataTable
              columns={columns}
              emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
              rowKey={(row) => row.shipmentId}
              rows={group.shipments}
            />
          </Panel>
        ))
      )}

      {trackingShipment ? (
        <ShipmentTrackingDialog
          onClose={() => setTrackingShipment(null)}
          service={resolved}
          shipment={trackingShipment}
        />
      ) : null}
    </div>
  );
}
