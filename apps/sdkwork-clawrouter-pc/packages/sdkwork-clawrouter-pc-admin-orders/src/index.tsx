import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Ban, CheckCircle2, ClipboardList, Eye, Receipt, Truck } from 'lucide-react';
import {
  AdminResourceCenter,
  ConfirmDialog,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/clawroutes-pc-commons';
import {
  backendFulfillmentShipmentCreate,
  backendFulfillmentShipmentUpdate,
  backendFulfillmentTrackingEventCreate,
  backendFulfillmentsList,
  backendOrdersManagementCancel,
  backendOrdersManagementClose,
  backendOrdersList,
  backendOrdersRetrieve,
  backendRefundApprovalCreate,
  backendRefundAttemptCreate,
  backendRefundsList,
  backendShipmentsList,
} from './ordersService';

type OrdersAdminTab = 'orders' | 'refunds' | 'fulfillments' | 'shipments';
type OrdersAdminGroup = string;

const DEFAULT_ORDERS_SECTION_ID: OrdersAdminTab = 'orders';
const CANCELLABLE_ORDER_STATUSES = new Set(['created', 'pending', 'pending_payment', 'unpaid']);
const CLOSEABLE_ORDER_STATUSES = new Set(['created', 'pending', 'pending_payment', 'unpaid', 'confirmed']);
const FINAL_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'closed', 'completed', 'finished']);
const REFUND_REVIEWABLE_STATUSES = new Set(['created', 'pending', 'requested', 'reviewing', 'submitted']);
const REFUND_EXECUTABLE_STATUSES = new Set(['approved', 'accepted', 'pending_execution', 'processing']);
const FINAL_REFUND_STATUSES = new Set(['rejected', 'refused', 'failed', 'completed', 'succeeded', 'success']);
const SHIPPABLE_FULFILLMENT_STATUSES = new Set(['created', 'pending', 'allocated', 'picking', 'packed', 'ready_to_ship']);
const SHIPMENT_SHIPPABLE_STATUSES = new Set(['created', 'pending', 'ready', 'picked', 'packed']);

type OrdersAdminProps = {
  sectionId?: string;
};

type OrdersTranslation = ReturnType<typeof useTranslation>['t'];
type OrderActionKind = 'cancelOrder' | 'closeOrder' | 'executeRefund';
type OrderActionConfirmation = {
  kind: OrderActionKind;
  record: AdminResourceRecord;
};
type OrderShipmentFormState = {
  carrierCode: string;
  fulfillmentId: string;
  trackingNo: string;
};
type OrderTrackingFormState = {
  fulfillmentId: string;
  shipmentId: string;
  status: string;
  trackingNo: string;
};

type OrdersAdminHandlers = {
  cancelOrder: (record: AdminResourceRecord) => void;
  closeOrder: (record: AdminResourceRecord) => void;
  inspectOrder: (record: AdminResourceRecord) => void;
  approveRefund: (record: AdminResourceRecord) => void;
  rejectRefund: (record: AdminResourceRecord) => void;
  executeRefund: (record: AdminResourceRecord) => void;
  createShipment: (record: AdminResourceRecord) => void;
  markShipmentShipped: (record: AdminResourceRecord) => void;
  addTrackingEvent: (record: AdminResourceRecord) => void;
};

function resolveOrdersSectionId(sectionId?: string): OrdersAdminTab {
  if (sectionId === 'orders' || sectionId === 'refunds' || sectionId === 'fulfillments' || sectionId === 'shipments') {
    return sectionId;
  }
  return DEFAULT_ORDERS_SECTION_ID;
}

function buildOrderSections(
  t: OrdersTranslation,
  handlers: OrdersAdminHandlers,
): AdminResourceSection<OrdersAdminTab, OrdersAdminGroup>[] {
  return [
    {
      id: 'orders',
      title: t('admin.commerce.orders.orders.title', 'Orders'),
      description: t('admin.commerce.orders.orders.desc', 'Unified order center for physical goods, virtual goods, memberships, and recharges.'),
      icon: <ClipboardList className="h-4 w-4" />,
      group: 'Orders',
      load: (params) => backendOrdersList(params),
      pagination: { initialPageSize: 50 },
      columns: [
        { key: 'order_no', label: t('admin.col.orderNo', 'Order No') },
        { key: 'order_type', label: t('admin.col.type', 'Type') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'pay_status', label: t('admin.col.payStatus', 'Pay Status') },
        { key: 'total_amount', label: t('admin.col.total', 'Total'), align: 'right' },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      rowActions: [
        {
          label: t('admin.commerce.orders.actions.view', 'View'),
          icon: <Eye className="h-3.5 w-3.5" />,
          onClick: handlers.inspectOrder,
        },
        {
          label: t('admin.commerce.orders.actions.cancel', 'Cancel order'),
          icon: <Ban className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canCancelOrderRecord(record),
          onClick: handlers.cancelOrder,
          title: (record) => canCancelOrderRecord(record)
            ? t('admin.commerce.orders.actions.cancelReady', 'Cancel unpaid pending order')
            : t('admin.commerce.orders.actions.cancelUnavailable', 'Only unpaid pending orders can be cancelled'),
          tone: 'danger',
        },
        {
          label: t('admin.commerce.orders.actions.close', 'Close order'),
          icon: <Ban className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canCloseOrderRecord(record),
          onClick: handlers.closeOrder,
          title: (record) => canCloseOrderRecord(record)
            ? t('admin.commerce.orders.actions.closeReady', 'Close order without refund execution')
            : t('admin.commerce.orders.actions.closeUnavailable', 'Only open unpaid orders can be closed'),
        },
      ],
      searchFields: ['id', 'order_no', 'order_type', 'status', 'pay_status', 'owner_user_id'],
    },
    {
      id: 'refunds',
      title: t('admin.commerce.orders.refunds.title', 'Refunds'),
      description: t('admin.commerce.orders.refunds.desc', 'Refund requests, refund items, provider attempts, and lifecycle state.'),
      icon: <Receipt className="h-4 w-4" />,
      group: 'Refunds & Fulfillment',
      load: (params) => backendRefundsList(params),
      pagination: { initialPageSize: 50 },
      columns: [
        { key: 'refund_no', label: t('admin.col.refund', 'Refund') },
        { key: 'order_id', label: t('admin.col.order', 'Order') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      rowActions: [
        {
          label: t('admin.commerce.orders.actions.approveRefund', 'Approve refund'),
          icon: <Receipt className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canReviewRefundRecord(record),
          onClick: handlers.approveRefund,
        },
        {
          label: t('admin.commerce.orders.actions.rejectRefund', 'Reject refund'),
          icon: <Ban className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canReviewRefundRecord(record),
          onClick: handlers.rejectRefund,
          tone: 'danger',
        },
        {
          label: t('admin.commerce.orders.actions.executeRefund', 'Execute refund'),
          icon: <Receipt className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canExecuteRefundRecord(record),
          onClick: handlers.executeRefund,
        },
      ],
      searchFields: ['refund_no', 'order_id', 'payment_intent_id', 'status', 'currency_code'],
    },
    {
      id: 'fulfillments',
      title: t('admin.commerce.orders.fulfillments.title', 'Fulfillments'),
      description: t('admin.commerce.orders.fulfillments.desc', 'Fulfillment orders for physical delivery, virtual delivery, membership entitlement, and recharge grant.'),
      icon: <Truck className="h-4 w-4" />,
      group: 'Refunds & Fulfillment',
      load: (params) => backendFulfillmentsList(params),
      pagination: { initialPageSize: 50 },
      columns: [
        { key: 'fulfillment_no', label: t('admin.col.fulfillment', 'Fulfillment') },
        { key: 'order_id', label: t('admin.col.order', 'Order') },
        { key: 'fulfillment_type', label: t('admin.col.fulfillmentType', 'Type') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      rowActions: [
        {
          label: t('admin.commerce.orders.actions.createShipment', 'Create shipment'),
          icon: <Truck className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canCreateShipmentForFulfillment(record),
          onClick: handlers.createShipment,
        },
      ],
      searchFields: ['fulfillment_no', 'order_id', 'fulfillment_type', 'status'],
    },
    {
      id: 'shipments',
      title: t('admin.commerce.orders.shipments.title', 'Shipments'),
      description: t('admin.commerce.orders.shipments.desc', 'Physical shipment records and carrier tracking state.'),
      icon: <Truck className="h-4 w-4" />,
      group: 'Refunds & Fulfillment',
      load: (params) => backendShipmentsList(params),
      pagination: { initialPageSize: 50 },
      columns: [
        { key: 'shipment_no', label: t('admin.col.shipment', 'Shipment') },
        { key: 'fulfillment_id', label: t('admin.col.fulfillment', 'Fulfillment') },
        { key: 'carrier_code', label: t('admin.col.carrier', 'Carrier') },
        { key: 'tracking_no', label: t('admin.col.tracking', 'Tracking') },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      rowActions: [
        {
          label: t('admin.commerce.orders.actions.markShipped', 'Mark shipped'),
          icon: <Truck className="h-3.5 w-3.5" />,
          isDisabled: (record) => !canMarkShipmentShipped(record),
          onClick: handlers.markShipmentShipped,
        },
        {
          label: t('admin.commerce.orders.actions.addTracking', 'Add tracking'),
          icon: <Truck className="h-3.5 w-3.5" />,
          onClick: handlers.addTrackingEvent,
        },
      ],
      searchFields: ['shipment_no', 'fulfillment_id', 'carrier_code', 'tracking_no', 'status'],
    },
  ];
}

function canCancelOrderRecord(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  if (!CANCELLABLE_ORDER_STATUSES.has(status)) {
    return false;
  }
  if (normalizeOrderStatus(record.pay_status || record.payStatus) === 'paid') {
    return false;
  }
  return !record.cancelled_at && !record.cancelledAt;
}

function canCloseOrderRecord(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  if (FINAL_ORDER_STATUSES.has(status)) {
    return false;
  }
  if (!CLOSEABLE_ORDER_STATUSES.has(status)) {
    return false;
  }
  return normalizeOrderStatus(record.pay_status || record.payStatus) !== 'paid';
}

function canReviewRefundRecord(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  return REFUND_REVIEWABLE_STATUSES.has(status) && !FINAL_REFUND_STATUSES.has(status);
}

function canExecuteRefundRecord(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  return REFUND_EXECUTABLE_STATUSES.has(status) && !FINAL_REFUND_STATUSES.has(status);
}

function canCreateShipmentForFulfillment(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  return !status || SHIPPABLE_FULFILLMENT_STATUSES.has(status);
}

function canMarkShipmentShipped(record: AdminResourceRecord): boolean {
  const status = normalizeOrderStatus(record.status);
  return !status || SHIPMENT_SHIPPABLE_STATUSES.has(status);
}

export function OrdersAdmin({ sectionId }: OrdersAdminProps = {}) {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [orderActionBusy, setOrderActionBusy] = useState(false);
  const [orderActionError, setOrderActionError] = useState<string | null>(null);
  const [orderActionSuccess, setOrderActionSuccess] = useState<string | null>(null);
  const [orderActionConfirmation, setOrderActionConfirmation] = useState<OrderActionConfirmation | null>(null);
  const [orderShipmentForm, setOrderShipmentForm] = useState<OrderShipmentFormState | null>(null);
  const [orderTrackingForm, setOrderTrackingForm] = useState<OrderTrackingFormState | null>(null);

  const runOrderMutation = useCallback(async (
    operation: () => Promise<unknown>,
    successMessage: string,
  ): Promise<boolean> => {
    setOrderActionBusy(true);
    setOrderActionError(null);
    setOrderActionSuccess(null);
    try {
      await operation();
      setOrderActionSuccess(successMessage);
      setRefreshKey((current) => current + 1);
      return true;
    } catch (error) {
      setOrderActionError(readOrderActionErrorMessage(
        error,
        t('admin.commerce.orders.actions.error', 'Order operation failed.'),
      ));
      return false;
    } finally {
      setOrderActionBusy(false);
    }
  }, [t]);

  const handleOrderInspect = useCallback((record: AdminResourceRecord) => {
    const orderId = readOrderId(record);
    if (!orderId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingOrderId', 'Order id is missing.'));
      return;
    }
    void runOrderMutation(
      () => backendOrdersRetrieve(orderId),
      t('admin.commerce.orders.actions.viewSuccess', 'Order details were loaded.'),
    );
  }, [runOrderMutation, t]);

  const handleOrderManagementCancel = useCallback((record: AdminResourceRecord) => {
    const orderId = readOrderId(record);
    if (!orderId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingOrderId', 'Order id is missing.'));
      return;
    }
    setOrderActionError(null);
    setOrderActionSuccess(null);
    setOrderActionConfirmation({ kind: 'cancelOrder', record });
  }, [t]);

  const handleOrderManagementClose = useCallback((record: AdminResourceRecord) => {
    const orderId = readOrderId(record);
    if (!orderId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingOrderId', 'Order id is missing.'));
      return;
    }
    setOrderActionError(null);
    setOrderActionSuccess(null);
    setOrderActionConfirmation({ kind: 'closeOrder', record });
  }, [t]);

  const handleRefundApproval = useCallback((record: AdminResourceRecord, action: 'approve' | 'reject') => {
    const refundId = readRefundId(record);
    if (!refundId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingRefundId', 'Refund id is missing.'));
      return;
    }
    void runOrderMutation(
      () => backendRefundApprovalCreate(refundId, {
        action,
        reason: action === 'approve' ? 'admin_approval' : 'admin_rejection',
        source: 'clawrouter_admin',
      }),
      action === 'approve'
        ? t('admin.commerce.orders.actions.approveRefundSuccess', 'Refund approved.')
        : t('admin.commerce.orders.actions.rejectRefundSuccess', 'Refund rejected.'),
    );
  }, [runOrderMutation, t]);

  const handleRefundAttempt = useCallback((record: AdminResourceRecord) => {
    const refundId = readRefundId(record);
    if (!refundId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingRefundId', 'Refund id is missing.'));
      return;
    }
    setOrderActionError(null);
    setOrderActionSuccess(null);
    setOrderActionConfirmation({ kind: 'executeRefund', record });
  }, [t]);

  const handleFulfillmentShipmentCreate = useCallback((record: AdminResourceRecord) => {
    const fulfillmentId = readFulfillmentId(record);
    if (!fulfillmentId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingFulfillmentId', 'Fulfillment id is missing.'));
      return;
    }
    setOrderActionError(null);
    setOrderActionSuccess(null);
    setOrderShipmentForm({
      carrierCode: readRecordString(record, ['carrier_code', 'carrierCode']) || 'manual',
      fulfillmentId,
      trackingNo: readRecordString(record, ['tracking_no', 'trackingNo']) || '',
    });
  }, [t]);

  const handleFulfillmentShipmentUpdate = useCallback((record: AdminResourceRecord) => {
    const fulfillmentId = readFulfillmentId(record);
    const shipmentId = readShipmentId(record);
    if (!fulfillmentId || !shipmentId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingShipmentId', 'Fulfillment id or shipment id is missing.'));
      return;
    }
    void runOrderMutation(
      () => backendFulfillmentShipmentUpdate(fulfillmentId, shipmentId, {
        source: 'clawrouter_admin',
        status: 'shipped',
      }),
      t('admin.commerce.orders.actions.markShippedSuccess', 'Shipment marked as shipped.'),
    );
  }, [runOrderMutation, t]);

  const handleShipmentTrackingEventCreate = useCallback((record: AdminResourceRecord) => {
    const fulfillmentId = readFulfillmentId(record);
    const shipmentId = readShipmentId(record);
    if (!fulfillmentId || !shipmentId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingShipmentId', 'Fulfillment id or shipment id is missing.'));
      return;
    }
    setOrderActionError(null);
    setOrderActionSuccess(null);
    setOrderTrackingForm({
      fulfillmentId,
      shipmentId,
      status: 'in_transit',
      trackingNo: readRecordString(record, ['tracking_no', 'trackingNo']) || '',
    });
  }, [t]);

  const executeConfirmedOrderAction = useCallback(async () => {
    const confirmation = orderActionConfirmation;
    if (!confirmation) {
      return;
    }
    if (confirmation.kind === 'cancelOrder') {
      const orderId = readOrderId(confirmation.record);
      if (!orderId) {
        setOrderActionError(t('admin.commerce.orders.validation.missingOrderId', 'Order id is missing.'));
        setOrderActionConfirmation(null);
        return;
      }
      const completed = await runOrderMutation(
        () => backendOrdersManagementCancel(orderId, {
          reason: 'admin_cancel',
          source: 'clawrouter_admin',
        }),
        t('admin.commerce.orders.actions.cancelSuccess', 'Order cancelled.'),
      );
      if (completed) {
        setOrderActionConfirmation(null);
      }
      return;
    }
    if (confirmation.kind === 'closeOrder') {
      const orderId = readOrderId(confirmation.record);
      if (!orderId) {
        setOrderActionError(t('admin.commerce.orders.validation.missingOrderId', 'Order id is missing.'));
        setOrderActionConfirmation(null);
        return;
      }
      const completed = await runOrderMutation(
        () => backendOrdersManagementClose(orderId, {
          reason: 'admin_close',
          source: 'clawrouter_admin',
        }),
        t('admin.commerce.orders.actions.closeSuccess', 'Order closed.'),
      );
      if (completed) {
        setOrderActionConfirmation(null);
      }
      return;
    }
    const refundId = readRefundId(confirmation.record);
    if (!refundId) {
      setOrderActionError(t('admin.commerce.orders.validation.missingRefundId', 'Refund id is missing.'));
      setOrderActionConfirmation(null);
      return;
    }
    const completed = await runOrderMutation(
      () => backendRefundAttemptCreate(refundId, {
        reason: 'admin_refund_execution',
        source: 'clawrouter_admin',
      }),
      t('admin.commerce.orders.actions.executeRefundSuccess', 'Refund execution request submitted.'),
    );
    if (completed) {
      setOrderActionConfirmation(null);
    }
  }, [orderActionConfirmation, runOrderMutation, t]);

  const submitOrderShipmentForm = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = orderShipmentForm;
    if (!form) {
      return;
    }
    const carrierCode = form.carrierCode.trim();
    const trackingNo = form.trackingNo.trim();
    if (!carrierCode || !trackingNo) {
      setOrderActionError(t('admin.commerce.orders.validation.shipmentRequired', 'Carrier code and tracking number are required.'));
      return;
    }
    const completed = await runOrderMutation(
      () => backendFulfillmentShipmentCreate(form.fulfillmentId, {
        carrierCode,
        source: 'clawrouter_admin',
        status: 'created',
        trackingNo,
      }),
      t('admin.commerce.orders.actions.createShipmentSuccess', 'Shipment created.'),
    );
    if (completed) {
      setOrderShipmentForm(null);
    }
  }, [orderShipmentForm, runOrderMutation, t]);

  const submitOrderTrackingForm = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = orderTrackingForm;
    if (!form) {
      return;
    }
    const status = form.status.trim();
    if (!status) {
      setOrderActionError(t('admin.commerce.orders.validation.trackingRequired', 'Tracking status is required.'));
      return;
    }
    const trackingNo = form.trackingNo.trim();
    const completed = await runOrderMutation(
      () => backendFulfillmentTrackingEventCreate(form.fulfillmentId, form.shipmentId, {
        source: 'clawrouter_admin',
        status,
        ...(trackingNo ? { trackingNo } : {}),
      }),
      t('admin.commerce.orders.actions.addTrackingSuccess', 'Tracking event added.'),
    );
    if (completed) {
      setOrderTrackingForm(null);
    }
  }, [orderTrackingForm, runOrderMutation, t]);

  const handlers = useMemo<OrdersAdminHandlers>(() => ({
    addTrackingEvent: handleShipmentTrackingEventCreate,
    approveRefund: (record) => handleRefundApproval(record, 'approve'),
    cancelOrder: handleOrderManagementCancel,
    closeOrder: handleOrderManagementClose,
    createShipment: handleFulfillmentShipmentCreate,
    executeRefund: handleRefundAttempt,
    inspectOrder: handleOrderInspect,
    markShipmentShipped: handleFulfillmentShipmentUpdate,
    rejectRefund: (record) => handleRefundApproval(record, 'reject'),
  }), [
    handleFulfillmentShipmentCreate,
    handleFulfillmentShipmentUpdate,
    handleOrderInspect,
    handleOrderManagementCancel,
    handleOrderManagementClose,
    handleRefundApproval,
    handleRefundAttempt,
    handleShipmentTrackingEventCreate,
  ]);
  const sections = useMemo(() => buildOrderSections(t, handlers), [handlers, t]);
  const activeSectionId = resolveOrdersSectionId(sectionId);
  const orderActionConfirmationAccount = orderActionConfirmation
    ? readOrderActionTargetLabel(orderActionConfirmation)
    : '';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-orders-layout>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdminResourceCenter
          activeSectionId={activeSectionId}
          emptyTitle={t('admin.commerce.orders.empty', 'No order records')}
          errorTitle={t('admin.commerce.orders.error', 'Order data could not be loaded')}
          loadingTitle={t('admin.commerce.orders.loading', 'Loading order records...')}
          paginationPageLabel={t('admin.commerce.orders.pagination.page', 'Page')}
          paginationPageSizeLabel={t('admin.commerce.orders.pagination.pageSize', 'Rows')}
          paginationShowingLabel={t('admin.commerce.orders.pagination.showing', 'Showing')}
          recordActionColumnLabel={t('common.columns.actions', 'Actions')}
          refreshKey={refreshKey}
          sections={sections}
          showSectionNavigation={false}
          tableViewportDataAttribute="admin-orders-table-viewport"
        />
      </div>
      {(orderActionError || orderActionSuccess) && (
        <div className="shrink-0" data-admin-order-action-feedback>
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
            orderActionError
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}>
            {orderActionError ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="min-w-0">{orderActionError ?? orderActionSuccess}</span>
          </div>
        </div>
      )}
      {orderActionConfirmation && (
        <ConfirmDialog
          title={orderActionConfirmationTitle(orderActionConfirmation.kind, t)}
          description={orderActionConfirmationDescription(
            orderActionConfirmation.kind,
            orderActionConfirmationAccount,
            t,
          )}
          confirmLabel={orderActionConfirmationLabel(orderActionConfirmation.kind, t)}
          tone={orderActionConfirmationTone(orderActionConfirmation.kind)}
          icon={<AlertTriangle className="h-4 w-4" />}
          isBusy={orderActionBusy}
          onConfirm={() => void executeConfirmedOrderAction()}
          onCancel={() => setOrderActionConfirmation(null)}
        />
      )}
      {orderShipmentForm && (
        <OrderShipmentFormDialog
          form={orderShipmentForm}
          isBusy={orderActionBusy}
          onCancel={() => setOrderShipmentForm(null)}
          onChange={setOrderShipmentForm}
          onSubmit={submitOrderShipmentForm}
          t={t}
        />
      )}
      {orderTrackingForm && (
        <OrderTrackingFormDialog
          form={orderTrackingForm}
          isBusy={orderActionBusy}
          onCancel={() => setOrderTrackingForm(null)}
          onChange={setOrderTrackingForm}
          onSubmit={submitOrderTrackingForm}
          t={t}
        />
      )}
    </div>
  );
}

function OrderShipmentFormDialog({
  form,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
  t,
}: {
  form: OrderShipmentFormState;
  isBusy: boolean;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<OrderShipmentFormState | null>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: OrdersTranslation;
}) {
  const carrierCode = form.carrierCode.trim();
  const trackingNo = form.trackingNo.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm">
      <form
        className="flex max-h-[calc(100vh-16px)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
        data-admin-order-shipment-form
        onSubmit={onSubmit}
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('admin.commerce.orders.shipmentForm.title', 'Create shipment')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.commerce.orders.shipmentForm.desc', 'Register the carrier and tracking number for this fulfillment.')}
          </p>
        </div>
        <div className="grid gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
          <OrderFormInput
            autoFocus
            label={t('admin.commerce.orders.shipmentForm.carrierCode', 'Carrier code')}
            onChange={(carrierCodeValue) => onChange((current) => current ? { ...current, carrierCode: carrierCodeValue } : current)}
            required
            value={form.carrierCode}
          />
          <OrderFormInput
            label={t('admin.commerce.orders.shipmentForm.trackingNo', 'Tracking number')}
            onChange={(trackingNoValue) => onChange((current) => current ? { ...current, trackingNo: trackingNoValue } : current)}
            required
            value={form.trackingNo}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            {t('common.actions.cancel', 'Cancel')}
          </button>
          <button
            aria-busy={isBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            disabled={isBusy || !carrierCode || !trackingNo}
            type="submit"
          >
            {t('admin.commerce.orders.actions.createShipment', 'Create shipment')}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderTrackingFormDialog({
  form,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
  t,
}: {
  form: OrderTrackingFormState;
  isBusy: boolean;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<OrderTrackingFormState | null>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: OrdersTranslation;
}) {
  const status = form.status.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-2 backdrop-blur-sm">
      <form
        className="flex max-h-[calc(100vh-16px)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
        data-admin-order-tracking-form
        onSubmit={onSubmit}
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t('admin.commerce.orders.trackingForm.title', 'Add tracking event')}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('admin.commerce.orders.trackingForm.desc', 'Record the latest shipment tracking state from the carrier.')}
          </p>
        </div>
        <div className="grid gap-4 overflow-y-auto px-5 py-4 md:grid-cols-2">
          <OrderFormInput
            autoFocus
            label={t('admin.commerce.orders.trackingForm.status', 'Tracking status')}
            onChange={(statusValue) => onChange((current) => current ? { ...current, status: statusValue } : current)}
            required
            value={form.status}
          />
          <OrderFormInput
            label={t('admin.commerce.orders.trackingForm.trackingNo', 'Tracking number')}
            onChange={(trackingNoValue) => onChange((current) => current ? { ...current, trackingNo: trackingNoValue } : current)}
            value={form.trackingNo}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-white/10">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={isBusy}
            onClick={onCancel}
            type="button"
          >
            {t('common.actions.cancel', 'Cancel')}
          </button>
          <button
            aria-busy={isBusy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            disabled={isBusy || !status}
            type="submit"
          >
            {t('admin.commerce.orders.actions.addTracking', 'Add tracking')}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrderFormInput({
  autoFocus = false,
  label,
  onChange,
  required = false,
  value,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        autoFocus={autoFocus}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#121212] dark:text-white"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type="text"
        value={value}
      />
    </label>
  );
}

function orderActionConfirmationTitle(kind: OrderActionKind, t: OrdersTranslation): string {
  if (kind === 'cancelOrder') {
    return t('admin.commerce.orders.confirm.cancelTitle', 'Cancel order?');
  }
  if (kind === 'closeOrder') {
    return t('admin.commerce.orders.confirm.closeTitle', 'Close order?');
  }
  return t('admin.commerce.orders.confirm.refundAttemptTitle', 'Execute refund?');
}

function orderActionConfirmationDescription(
  kind: OrderActionKind,
  target: string,
  t: OrdersTranslation,
): string {
  if (kind === 'cancelOrder') {
    return t(
      'admin.commerce.orders.confirm.cancelDescription',
      'Cancel order {{target}}. This writes an admin cancellation action and refreshes the order list.',
      { target },
    );
  }
  if (kind === 'closeOrder') {
    return t(
      'admin.commerce.orders.confirm.closeDescription',
      'Close order {{target}} without executing a payment refund.',
      { target },
    );
  }
  return t(
    'admin.commerce.orders.confirm.refundAttemptDescription',
    'Submit a provider refund attempt for refund {{target}}.',
    { target },
  );
}

function orderActionConfirmationLabel(kind: OrderActionKind, t: OrdersTranslation): string {
  if (kind === 'cancelOrder') {
    return t('admin.commerce.orders.actions.cancel', 'Cancel order');
  }
  if (kind === 'closeOrder') {
    return t('admin.commerce.orders.actions.close', 'Close order');
  }
  return t('admin.commerce.orders.actions.executeRefund', 'Execute refund');
}

function orderActionConfirmationTone(kind: OrderActionKind): 'danger' | 'default' {
  return kind === 'cancelOrder' ? 'danger' : 'default';
}

function readOrderActionTargetLabel(confirmation: OrderActionConfirmation): string {
  if (confirmation.kind === 'executeRefund') {
    return readRefundId(confirmation.record) ?? '-';
  }
  return readRecordString(confirmation.record, ['order_no', 'orderNo', 'id', 'order_id', 'orderId']) ?? '-';
}

function readOrderActionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeOrderStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function readOrderId(record: AdminResourceRecord): string | null {
  return readRecordString(record, ['id', 'order_id', 'orderId']);
}

function readRefundId(record: AdminResourceRecord): string | null {
  return readRecordString(record, ['id', 'refund_id', 'refundId']);
}

function readFulfillmentId(record: AdminResourceRecord): string | null {
  return readRecordString(record, ['fulfillment_id', 'fulfillmentId', 'id']);
}

function readShipmentId(record: AdminResourceRecord): string | null {
  return readRecordString(record, ['shipment_id', 'shipmentId', 'id']);
}

function readRecordString(record: AdminResourceRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}
