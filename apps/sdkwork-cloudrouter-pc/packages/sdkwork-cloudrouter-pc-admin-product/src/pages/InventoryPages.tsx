import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Pencil } from 'lucide-react';

import {
  Button,
  StatusBadge,
  formatTimestamp,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { ResourcePageFrame, requireString, type ProductCenterPageProps } from './resourcePage.tsx';
import {
  getProductCenterService,
  type InventoryMovement,
  type InventoryReservation,
  type InventoryStock,
} from '../productCenterService.ts';

const STOCK_STATUSES = ['active', 'inactive'] as const;
const MOVEMENT_TYPES = ['inbound', 'outbound', 'stocktake'] as const;
const RESERVATION_STATUSES = ['reserved', 'consumed', 'released', 'expired'] as const;

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function StockListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [adjusting, setAdjusting] = useState<{ stock: InventoryStock; reload: () => void } | null>(null);
  const [settings, setSettings] = useState<{ stock: InventoryStock; reload: () => void } | null>(null);

  const filters = useMemo<FilterControl[]>(() => [
    { name: 'skuId', label: t('admin.productCenter.stocks.filter.sku', 'SKU id'), kind: 'text' },
    { name: 'warehouseId', label: t('admin.productCenter.stocks.filter.warehouse', 'Warehouse id'), kind: 'text' },
    {
      name: 'status',
      label: t('admin.productCenter.stocks.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...STOCK_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listStocks({
        page: query.page,
        pageSize: query.pageSize,
        skuId: query.filters.skuId || undefined,
        warehouseId: query.filters.warehouseId || undefined,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<InventoryStock>[]>(() => [
    {
      key: 'skuId',
      header: t('admin.productCenter.stocks.column.skuId', 'SKU id'),
      cell: (row) => <span className="font-mono text-xs">{row.skuId}</span>,
    },
    {
      key: 'warehouse',
      header: t('admin.productCenter.stocks.column.warehouse', 'Warehouse'),
      cell: (row) => row.warehouseId ?? '-',
    },
    {
      key: 'onHand',
      header: t('admin.productCenter.stocks.column.onHand', 'On hand'),
      cell: (row) => row.onHandQuantity ?? '-',
    },
    {
      key: 'available',
      header: t('admin.productCenter.stocks.column.available', 'Available'),
      cell: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{row.availableQuantity}</span>
      ),
    },
    {
      key: 'reserved',
      header: t('admin.productCenter.stocks.column.reserved', 'Reserved'),
      cell: (row) => row.reservedQuantity,
    },
    {
      key: 'safety',
      header: t('admin.productCenter.stocks.column.safety', 'Safety stock'),
      cell: (row) => row.safetyStockQuantity ?? '-',
    },
    {
      key: 'status',
      header: t('admin.productCenter.stocks.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [t]);

  const adjustmentFields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'movementType',
      label: t('admin.productCenter.stocks.movement.type', 'Movement type'),
      kind: 'select',
      options: (['inbound', 'outbound', 'stocktake'] as const).map((value) => ({
        value,
        label: t(`admin.productCenter.stocks.movement.${value}`, value),
      })),
    },
    {
      name: 'quantity',
      label: t('admin.productCenter.stocks.movement.quantity', 'Quantity (inbound / outbound)'),
      kind: 'number',
      help: t('admin.productCenter.stocks.movement.quantityHint', 'Used for inbound and outbound; must be a positive whole number.'),
    },
    {
      name: 'countedAvailable',
      label: t('admin.productCenter.stocks.movement.counted', 'Counted available quantity (stocktake)'),
      kind: 'number',
      help: t('admin.productCenter.stocks.movement.countedHint', 'Used for stocktake: the delta is computed against the current available quantity.'),
    },
    {
      name: 'reason',
      label: t('admin.productCenter.stocks.movement.reason', 'Reason'),
      kind: 'textarea',
    },
  ], [t]);

  const settingsFields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'safetyStockQuantity',
      label: t('admin.productCenter.stocks.field.safetyStockQuantity', 'Safety stock quantity'),
      kind: 'number',
      help: t('admin.productCenter.stocks.field.safetyStockHint', 'Must be zero or greater.'),
    },
    {
      name: 'status',
      label: t('admin.productCenter.stocks.field.status', 'Status'),
      kind: 'select',
      options: STOCK_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  const submitAdjustment = (stock: InventoryStock, values: Record<string, string | boolean>) => {
    const movementType = values.movementType === 'inbound' || values.movementType === 'outbound'
      ? values.movementType
      : 'stocktake';
    let delta: number;
    if (movementType === 'stocktake') {
      // An empty "counted" field must never be read as 0: that would silently
      // write off the whole available quantity.
      const countedRaw = typeof values.countedAvailable === 'string' ? values.countedAvailable.trim() : '';
      if (!countedRaw) {
        return Promise.reject(new Error(t('admin.productCenter.stocks.movement.countedRequired', 'Enter the counted quantity for a stocktake.')));
      }
      const counted = Number(countedRaw);
      if (!Number.isFinite(counted) || counted < 0) {
        return Promise.reject(new Error(t('admin.productCenter.stocks.movement.countedHint', 'Counted quantity is required.')));
      }
      delta = counted - Number(stock.availableQuantity);
    } else {
      const quantityRaw = typeof values.quantity === 'string' ? values.quantity.trim() : '';
      if (!quantityRaw) {
        return Promise.reject(new Error(t('admin.productCenter.stocks.movement.quantityRequired', 'Enter the inbound or outbound quantity.')));
      }
      const quantity = Number(quantityRaw);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return Promise.reject(new Error(t('admin.productCenter.stocks.movement.quantityHint', 'Quantity must be positive.')));
      }
      delta = movementType === 'inbound' ? quantity : -quantity;
    }
    if (delta === 0) {
      return Promise.reject(new Error(t('admin.productCenter.stocks.movement.noChange', 'The adjustment does not change the quantity.')));
    }
    const reason = optionalString(values, 'reason');
    return resolved.adjustStock(stock.id, {
      quantityDelta: String(delta),
      movementType,
      ...(reason ? { reason } : {}),
    }).then(() => undefined);
  };

  return (
    <>
      <ResourcePageFrame<InventoryStock>
        columns={columns}
        description={t('admin.productCenter.stocks.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row, context) => (
          <>
            <Button onClick={() => setAdjusting({ stock: row, reload: context.reload })} variant="ghost">
              <ArrowLeftRight aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.stocks.action.adjust', 'Stock movement')}
            </Button>
            <Button onClick={() => setSettings({ stock: row, reload: context.reload })} variant="ghost">
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.stocks.action.settings', 'Safety stock')}
            </Button>
          </>
        )}
        rowKey={(row) => row.id}
        title={t('admin.productCenter.stocks.title', 'Stock Levels')}
      />

      <RecordFormDialog
        fields={adjustmentFields}
        initialValues={{ movementType: 'stocktake' }}
        onClose={() => setAdjusting(null)}
        onSubmit={(values) => {
          if (!adjusting) {
            return Promise.resolve();
          }
          const target = adjusting;
          return submitAdjustment(target.stock, values).then(() => target.reload());
        }}
        open={adjusting !== null}
        title={t('admin.productCenter.stocks.movement.title', 'Record stock movement')}
      />

      <RecordFormDialog
        fields={settingsFields}
        initialValues={settings ? {
          safetyStockQuantity: settings.stock.safetyStockQuantity ?? '',
          status: settings.stock.status,
        } : {}}
        onClose={() => setSettings(null)}
        onSubmit={(values) => {
          if (!settings) {
            return Promise.resolve();
          }
          const target = settings;
          return resolved.updateStock(target.stock.id, {
            ...(optionalString(values, 'safetyStockQuantity')
              ? { safetyStockQuantity: optionalString(values, 'safetyStockQuantity') }
              : {}),
            ...(optionalString(values, 'status') ? { status: optionalString(values, 'status') } : {}),
          }).then(() => target.reload());
        }}
        open={settings !== null}
        title={t('admin.productCenter.stocks.settingsTitle', 'Stock settings')}
      />
    </>
  );
}

export function MovementListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);

  const filters = useMemo<FilterControl[]>(() => [
    { name: 'skuId', label: t('admin.productCenter.movements.filter.sku', 'SKU id'), kind: 'text' },
    {
      name: 'movementType',
      label: t('admin.productCenter.movements.filter.type', 'Movement type'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...MOVEMENT_TYPES.map((type) => ({
          value: type,
          label: t(`admin.productCenter.stocks.movement.${type}`, type),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listMovements({
        page: query.page,
        pageSize: query.pageSize,
        skuId: query.filters.skuId || undefined,
        movementType: query.filters.movementType || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<InventoryMovement>[]>(() => [
    {
      key: 'movementNo',
      header: t('admin.productCenter.movements.column.movementNo', 'Movement no.'),
      cell: (row) => <span className="font-mono text-xs">{row.movementNo ?? row.id}</span>,
    },
    {
      key: 'skuId',
      header: t('admin.productCenter.movements.column.skuId', 'SKU id'),
      cell: (row) => <span className="font-mono text-xs">{row.skuId}</span>,
    },
    {
      key: 'type',
      header: t('admin.productCenter.movements.column.type', 'Type'),
      cell: (row) => row.movementType,
    },
    {
      key: 'quantity',
      header: t('admin.productCenter.movements.column.quantity', 'Quantity'),
      cell: (row) => <span className="font-semibold">{row.quantity}</span>,
    },
    {
      key: 'direction',
      header: t('admin.productCenter.movements.column.direction', 'Direction'),
      cell: (row) => row.direction ?? '-',
    },
    {
      key: 'occurredAt',
      header: t('admin.productCenter.movements.column.occurredAt', 'Occurred'),
      cell: (row) => (
        <span className="whitespace-nowrap text-xs">{formatTimestamp(row.occurredAt ?? row.createdAt)}</span>
      ),
    },
  ], [t]);

  return (
    <ResourcePageFrame<InventoryMovement>
      columns={columns}
      description={t('admin.productCenter.movements.description', '')}
      emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
      filters={filters}
      load={load}
      rowKey={(row) => row.id}
      title={t('admin.productCenter.movements.title', 'Stock Movements')}
    />
  );
}

export function ReservationListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);

  const filters = useMemo<FilterControl[]>(() => [
    { name: 'skuId', label: t('admin.productCenter.reservations.filter.sku', 'SKU id'), kind: 'text' },
    { name: 'orderId', label: t('admin.productCenter.reservations.filter.order', 'Order id'), kind: 'text' },
    {
      name: 'status',
      label: t('admin.productCenter.reservations.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...RESERVATION_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.reservations.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listReservations({
        page: query.page,
        pageSize: query.pageSize,
        skuId: query.filters.skuId || undefined,
        orderId: query.filters.orderId || undefined,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<InventoryReservation>[]>(() => [
    {
      key: 'reservationNo',
      header: t('admin.productCenter.reservations.column.reservationNo', 'Reservation no.'),
      cell: (row) => <span className="font-mono text-xs">{row.reservationNo ?? row.id}</span>,
    },
    {
      key: 'orderId',
      header: t('admin.productCenter.reservations.column.orderId', 'Order id'),
      cell: (row) => <span className="font-mono text-xs">{row.orderId ?? '-'}</span>,
    },
    {
      key: 'skuId',
      header: t('admin.productCenter.reservations.column.skuId', 'SKU id'),
      cell: (row) => <span className="font-mono text-xs">{row.skuId}</span>,
    },
    {
      key: 'quantity',
      header: t('admin.productCenter.reservations.column.quantity', 'Quantity'),
      cell: (row) => <span className="font-semibold">{row.quantity}</span>,
    },
    {
      key: 'status',
      header: t('admin.productCenter.reservations.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [t]);

  return (
    <ResourcePageFrame<InventoryReservation>
      columns={columns}
      description={t('admin.productCenter.reservations.description', '')}
      emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
      filters={filters}
      load={load}
      rowKey={(row) => row.id}
      title={t('admin.productCenter.reservations.title', 'Reservations')}
    />
  );
}
