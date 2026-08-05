import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, BarChart3, CheckCircle2, CreditCard, Eye, Pencil, Plus, QrCode, Receipt, RotateCcw, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import {
  AdminResourceCenter,
  AdminResourceHelpButton,
  readAdminResourceRecordList,
  type AdminResourceHelpContent,
  type AdminResourceLoadParams,
  type AdminResourceRecord,
  type AdminResourceSection,
} from '@sdkwork/cloudroutes-pc-commons';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  PaymentProviderAdminWorkspace,
  createPaymentProviderAdminController,
  type PaymentProviderAdminCapabilities,
} from '@sdkwork/payment-pc-admin-provider';
import {
  useSdkworkBaseDataCountryOptions,
  useSdkworkBaseDataCurrencyOptions,
} from '@sdkwork/appbase-pc-react';
import { getCloudRouterPaymentBackendService } from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import {
  backendPaymentChannelsCreate,
  backendPaymentDevSandboxTrigger,
  backendPaymentMethodsCreate,
  backendPaymentMethodsUpdate,
  backendPaymentProviderAccountsList,
  backendPaymentReconciliationRunsCreate,
  backendPaymentRefundsCreate,
  backendPaymentRefundsRetry,
  backendPaymentRouteRulesCreate,
  backendPaymentRouteRulesDelete,
  backendPaymentRouteRulesUpdate,
  backendPaymentWebhookEventsReplay,
  backendPaymentsAttemptsList,
  backendPaymentsChannelsList,
  backendPaymentsIntentsList,
  backendPaymentsMethodsList,
  backendPaymentsProvidersList,
  backendPaymentsReconciliationRunsList,
  backendPaymentsRefundsList,
  backendPaymentsRouteRulesList,
  backendPaymentsWebhookEventsList,
} from './paymentsService';
import {
  buildChannelCreateCommand,
  buildMethodCreateCommand,
  buildMethodUpdateCommand,
  buildReconciliationRunCreateCommand,
  buildRouteRuleCreateCommand,
  buildRouteRuleUpdateCommand,
  methodFormValuesFromRecord,
  routeRuleFormValuesFromRecord,
  ChannelFormDialog,
  MethodFormDialog,
  PaymentConfirmDialog,
  ReconciliationRunFormDialog,
  RouteRuleFormDialog,
  type PaymentChannelFormValues,
  type PaymentMethodFormValues,
  type ReconciliationRunFormValues,
  type RouteRuleFormValues,
} from './forms/PaymentMaintenanceDialogs';
import {
  buildRefundCreateCommand,
  buildRefundRetryCommand,
  formatRefundAmount,
  RefundCreateDialog,
  RefundRetryDialog,
  type RefundCreateFormValues,
  type RefundRetryFormValues,
} from './forms/RefundDialogs';
import { IntentDetailDrawer } from './components/IntentDetailDrawer';
import { RefundDetailDrawer } from './components/RefundDetailDrawer';
import { PaymentTestDialog } from './components/PaymentTestDialog';

type PaymentsAdminTab =
  | 'providers'
  | 'providerAccounts'
  | 'methods'
  | 'channels'
  | 'routeRules'
  | 'intents'
  | 'attempts'
  | 'webhookEvents'
  | 'reconciliationRuns'
  | 'refunds';

type PaymentResourceTab = Exclude<PaymentsAdminTab, 'providerAccounts'>;
type PaymentsAdminGroup = string;

type PaymentsAdminProps = {
  sectionId?: string;
};

const DEFAULT_PAYMENTS_SECTION_ID: PaymentsAdminTab = 'providerAccounts';
const DEFAULT_PAYMENT_RESOURCE_SECTION_ID: PaymentResourceTab = 'providers';
const PAYMENT_LIST_PAGINATION = {
  initialPageSize: 20,
  pageSizeOptions: [20, 50, 100],
};
function resolvePaymentsSectionId(sectionId?: string): PaymentsAdminTab {
  if (
    sectionId === 'providers'
    || sectionId === 'providerAccounts'
    || sectionId === 'methods'
    || sectionId === 'channels'
    || sectionId === 'routeRules'
    || sectionId === 'intents'
    || sectionId === 'attempts'
    || sectionId === 'webhookEvents'
    || sectionId === 'reconciliationRuns'
    || sectionId === 'refunds'
  ) {
    return sectionId;
  }
  return DEFAULT_PAYMENTS_SECTION_ID;
}

export function PaymentsAdmin({ sectionId }: PaymentsAdminProps = {}) {
  const activeSectionId = resolvePaymentsSectionId(sectionId);
  if (activeSectionId === 'providerAccounts') {
    return <PaymentProviderAccountsAdmin />;
  }
  return <PaymentResourceAdmin activeSectionId={activeSectionId} />;
}

function PaymentProviderAccountsAdmin() {
  const { t } = useTranslation();
  const capabilities = usePaymentProviderAdminCapabilities();
  const controller = useMemo(
    () => createPaymentProviderAdminController({ service: getCloudRouterPaymentBackendService() }),
    [],
  );

  const countryOptions = useSdkworkBaseDataCountryOptions();

  const currencyOptions = useSdkworkBaseDataCurrencyOptions();

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-payments-provider-workspace>
      {/* The workspace manages its own scroll inside the tab content so the
          tab header stays visible and the list fills the available height. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PaymentProviderAdminWorkspace
          capabilities={capabilities}
          controller={controller}
          countryOptions={countryOptions ?? []}
          currencyOptions={currencyOptions ?? []}
          description={t(
            'admin.commerce.payments.providerAccounts.desc',
            'Manage write-only provider credentials, readiness checks, rotation, and partner sub-merchants.',
          )}
          tabActions={
            <AdminResourceHelpButton
              closeLabel={t('admin.commerce.payments.help.close', 'Close')}
              content={sectionHelp(t, 'providerAccounts', 7, 4)}
              label={t('admin.commerce.payments.help.label', 'How to use')}
              notesLabel={t('admin.commerce.payments.help.notes', 'Notes')}
            />
          }
          title={t('admin.commerce.payments.providerAccounts.title', 'Provider Accounts')}
        />
      </div>
    </div>
  );
}

type PaymentDialogState =
  | { kind: 'method-create' }
  | { kind: 'method-edit'; record: AdminResourceRecord }
  | { kind: 'method-test-payment'; record: AdminResourceRecord }
  | { kind: 'channel-create' }
  | { kind: 'routeRule-create' }
  | { kind: 'routeRule-edit'; record: AdminResourceRecord }
  | { kind: 'routeRule-delete'; record: AdminResourceRecord }
  | { kind: 'reconciliation-create' }
  | { kind: 'webhook-replay'; record: AdminResourceRecord }
  | { kind: 'sandbox-trigger-intent'; record: AdminResourceRecord }
  | { kind: 'sandbox-trigger-attempt'; record: AdminResourceRecord }
  | { kind: 'refund-create'; intentId?: string; intentNo?: string }
  | { kind: 'refund-retry'; record: AdminResourceRecord }
  | null;

const PENDING_PAYMENT_STATUSES = new Set(['created', 'pending', 'processing']);

/**
 * Provider codes whose checkout returns a scan-to-pay QR code; the one-cent
 * test action is offered only for these payment methods.
 */
const QR_TEST_PROVIDER_CODES = new Set(['wechat_pay', 'alipay', 'sandbox']);

function PaymentResourceAdmin({ activeSectionId }: { activeSectionId: PaymentResourceTab }) {
  const { t, i18n } = useTranslation();
  const [dialog, setDialog] = useState<PaymentDialogState>(null);
  const [detailIntentId, setDetailIntentId] = useState<string | null>(null);
  const [detailRefundId, setDetailRefundId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const paymentSections = useMemo<AdminResourceSection<PaymentResourceTab, PaymentsAdminGroup>[]>(() => {
    const formatStatus = formatEnumCell(t, 'admin.commerce.payments.value.status');
    const formatReasonCode = formatEnumCell(t, 'admin.commerce.payments.value.reasonCode');
    const formatRequestedByType = formatEnumCell(t, 'admin.commerce.payments.value.requestedByType');
    const formatScope = formatEnumCell(t, 'admin.commerce.payments.value.scope');
    const formatScene = formatEnumCell(t, 'admin.commerce.payments.value.scene');
    const formatReconciliationType = formatEnumCell(t, 'admin.commerce.payments.value.reconciliationType');
    const formatCapabilities = formatEnumArrayCell(t, 'admin.commerce.payments.value.capability');
    const formatLocalizedMethodName = (value: unknown, record: AdminResourceRecord) =>
      formatLocalizedName(i18n, record, 'displayNameI18n', value);
    const formatLocalizedChannelName = (value: unknown, record: AdminResourceRecord) =>
      formatLocalizedName(i18n, record, 'channelNameI18n', value);
    return [
    createPaymentListSection({
      id: 'providers',
      title: t('admin.commerce.payments.providers.title', 'Payment Providers'),
      description: t(
        'admin.commerce.payments.providers.desc',
        'Cloud Router provider inventory and product-specific availability metadata.',
      ),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsProvidersList,
      columns: [
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'displayName', label: t('admin.col.name', 'Name'), format: formatLocalizedMethodName },
        { key: 'providerType', label: t('admin.col.type', 'Type') },
        { key: 'supportedCountries', label: t('admin.col.countries', 'Countries'), format: formatArrayCell },
        { key: 'supportedCurrencies', label: t('admin.col.currencies', 'Currencies'), format: formatArrayCell },
        { key: 'capabilities', label: t('admin.col.capabilities', 'Capabilities'), format: formatCapabilities },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      
      searchFields: ['providerCode', 'displayName', 'providerType', 'supportedCountries', 'supportedCurrencies', 'capabilities', 'status'],
      help: sectionHelp(t, 'providers', 5, 3),
    }),
    createPaymentListSection({
      id: 'methods',
      title: t('admin.commerce.payments.methods.title', 'Payment Methods'),
      description: t('admin.commerce.payments.methods.desc', 'Payment methods exposed to checkout, memberships, recharge, and wallet flows.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsMethodsList,
      action: {
        label: t('admin.commerce.payments.methods.create.title', 'Create payment method'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'method-create' }),
      },
      rowActions: [{
        label: t('admin.commerce.payments.methods.edit', 'Edit'),
        icon: <Pencil className="h-3.5 w-3.5" />,
        onClick: (record) => setDialog({ kind: 'method-edit', record }),
      }, {
        label: t('admin.commerce.payments.methods.testPayment.action', 'One-cent test'),
        icon: <QrCode className="h-3.5 w-3.5" />,
        isVisible: (record) => QR_TEST_PROVIDER_CODES.has(String(record.providerCode ?? ''))
          && String(record.status ?? '') === 'active',
        onClick: (record) => setDialog({ kind: 'method-test-payment', record }),
      }],
      columns: [
        { key: 'methodKey', label: t('admin.commerce.payments.col.methodKey', 'Method Key') },
        { key: 'displayName', label: t('admin.col.name', 'Name'), format: formatLocalizedMethodName },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'scope', label: t('admin.col.scope', 'Scope'), format: formatScope },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'sortOrder', label: t('admin.col.sort', 'Sort'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      
      searchFields: ['methodKey', 'displayName', 'providerCode', 'scope', 'currencyCode', 'status'],
      help: sectionHelp(t, 'methods', 6, 3),
    }),
    createPaymentListSection({
      id: 'channels',
      title: t('admin.commerce.payments.channels.title', 'Payment Channels'),
      description: t('admin.commerce.payments.channels.desc', 'Country, currency, scene, and provider-account routing channels.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsChannelsList,
      action: {
        label: t('admin.commerce.payments.channels.create.title', 'Create payment channel'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'channel-create' }),
      },
      columns: [
        { key: 'channelNo', label: t('admin.col.channel', 'Channel') },
        { key: 'channelName', label: t('admin.commerce.payments.col.channelName', 'Channel Name'), format: formatLocalizedChannelName },
        { key: 'methodId', label: t('admin.commerce.payments.col.methodId', 'Method ID') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'providerAccountId', label: t('admin.col.account', 'Account') },
        { key: 'sceneCode', label: t('admin.col.scene', 'Scene'), format: formatScene },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      
      searchFields: ['channelNo', 'channelName', 'methodId', 'providerAccountId', 'countryCode', 'currencyCode', 'sceneCode', 'status'],
      help: sectionHelp(t, 'channels', 6, 3),
    }),
    createPaymentListSection({
      id: 'routeRules',
      title: t('admin.commerce.payments.routeRules.title', 'Route Rules'),
      description: t('admin.commerce.payments.routeRules.desc', 'Payment route rules by market, method, currency, priority, and fallback.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsRouteRulesList,
      action: {
        label: t('admin.commerce.payments.routeRules.create.title', 'Create route rule'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'routeRule-create' }),
      },
      rowActions: [
        {
          label: t('admin.commerce.payments.routeRules.edit', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: (record) => setDialog({ kind: 'routeRule-edit', record }),
        },
        {
          label: t('admin.commerce.payments.routeRules.delete', 'Delete'),
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: 'danger',
          onClick: (record) => setDialog({ kind: 'routeRule-delete', record }),
        },
      ],
      columns: [
        { key: 'ruleNo', label: t('admin.col.rule', 'Rule') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'purchaseType', label: t('admin.commerce.payments.col.purchaseType', 'Purchase Type') },
        { key: 'channelId', label: t('admin.commerce.payments.col.channelId', 'Channel ID') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'clientPlatform', label: t('admin.commerce.payments.col.clientPlatform', 'Client Platform') },
        { key: 'riskLevel', label: t('admin.commerce.payments.col.riskLevel', 'Risk Level') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      
      searchFields: ['ruleNo', 'purchaseType', 'countryCode', 'currencyCode', 'clientPlatform', 'channelId', 'status'],
      help: sectionHelp(t, 'routeRules', 6, 3),
    }),
    createPaymentListSection({
      id: 'intents',
      title: t('admin.commerce.payments.intents.title', 'Payment Intents'),
      description: t('admin.commerce.payments.intents.desc', 'Unified payment intents created from orders, memberships, recharge, and wallet flows.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: backendPaymentsIntentsList,
      rowActions: [{
        label: t('admin.commerce.payments.intents.detail.open', 'Details'),
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: (record) => setDetailIntentId(String(record.id ?? '')),
      }, {
        label: t('admin.commerce.payments.refunds.create.intentAction', 'Refund'),
        icon: <Undo2 className="h-3.5 w-3.5" />,
        isVisible: (record) => String(record.status ?? '') === 'succeeded',
        onClick: (record) => setDialog({
          kind: 'refund-create',
          intentId: String(record.id ?? ''),
          intentNo: String(record.paymentIntentNo ?? ''),
        }),
      }, {
        label: t('admin.commerce.payments.sandboxTrigger.action', 'Simulate success callback'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => PENDING_PAYMENT_STATUSES.has(String(record.status ?? '')),
        onClick: (record) => setDialog({ kind: 'sandbox-trigger-intent', record }),
      }],
      columns: [
        { key: 'paymentIntentNo', label: t('admin.commerce.payments.col.paymentIntentNo', 'Intent No') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'paymentMethod', label: t('admin.commerce.payments.col.paymentMethod', 'Payment Method') },
        { key: 'ownerUserId', label: t('admin.commerce.payments.col.ownerUserId', 'Owner User') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      
      searchFields: ['paymentIntentNo', 'orderId', 'paymentMethod', 'ownerUserId', 'providerCode', 'currencyCode', 'status'],
      help: sectionHelp(t, 'intents', 5, 3),
    }),
    createPaymentListSection({
      id: 'attempts',
      title: t('admin.commerce.payments.attempts.title', 'Payment Attempts'),
      description: t('admin.commerce.payments.attempts.desc', 'Provider request attempts, external trade numbers, and payment result lifecycle.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: backendPaymentsAttemptsList,
      rowActions: [{
        label: t('admin.commerce.payments.sandboxTrigger.action', 'Simulate success callback'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => PENDING_PAYMENT_STATUSES.has(String(record.status ?? '')),
        onClick: (record) => setDialog({ kind: 'sandbox-trigger-attempt', record }),
      }],
      columns: [
        { key: 'attemptNo', label: t('admin.col.attempt', 'Attempt') },
        { key: 'paymentIntentId', label: t('admin.commerce.payments.col.paymentIntentId', 'Intent ID') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'outTradeNo', label: t('admin.commerce.payments.col.outTradeNo', 'Out Trade No') },
        { key: 'providerTransactionId', label: t('admin.commerce.payments.col.providerTransactionId', 'Provider Transaction') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'paidAt', label: t('admin.col.paid', 'Paid') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
      ],
      
      searchFields: ['attemptNo', 'paymentIntentId', 'providerCode', 'outTradeNo', 'providerTransactionId', 'currencyCode', 'status'],
      help: sectionHelp(t, 'attempts', 5, 3),
    }),
    createPaymentListSection({
      id: 'webhookEvents',
      title: t('admin.commerce.payments.webhookEvents.title', 'Webhook Events'),
      description: t('admin.commerce.payments.webhookEvents.desc', 'Inbound payment webhook events and idempotent processing state.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: backendPaymentsWebhookEventsList,
      rowActions: [{
        label: t('admin.commerce.payments.webhookEvents.replay', 'Replay'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        onClick: (record) => setDialog({ kind: 'webhook-replay', record }),
      }],
      columns: [
        { key: 'eventId', label: t('admin.col.event', 'Event') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'eventType', label: t('admin.col.type', 'Type') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'retries', label: t('admin.commerce.payments.col.retries', 'Retries'), align: 'right' },
        { key: 'lastError', label: t('admin.commerce.payments.col.lastError', 'Last Error') },
        { key: 'receivedAt', label: t('admin.col.received', 'Received') },
        { key: 'processedAt', label: t('admin.col.processed', 'Processed') },
      ],
      
      searchFields: ['eventId', 'providerCode', 'eventType', 'status', 'lastError'],
      help: sectionHelp(t, 'webhookEvents', 5, 3),
    }),
    createPaymentListSection({
      id: 'reconciliationRuns',
      title: t('admin.commerce.payments.reconciliationRuns.title', 'Reconciliation Runs'),
      description: t('admin.commerce.payments.reconciliationRuns.desc', 'Payment reconciliation batches, statement imports, and discrepancy tracking.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: backendPaymentsReconciliationRunsList,
      action: {
        label: t('admin.commerce.payments.reconciliationRuns.create.title', 'Create reconciliation run'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'reconciliation-create' }),
      },
      columns: [
        { key: 'runNo', label: t('admin.col.run', 'Run') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'reconciliationType', label: t('admin.commerce.payments.col.reconciliationType', 'Type'), format: formatReconciliationType },
        { key: 'periodStart', label: t('admin.commerce.payments.col.periodStart', 'Period Start') },
        { key: 'periodEnd', label: t('admin.commerce.payments.col.periodEnd', 'Period End') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'matchedCount', label: t('admin.commerce.payments.col.matched', 'Matched'), align: 'right' },
        { key: 'mismatchedCount', label: t('admin.commerce.payments.col.mismatched', 'Mismatched'), align: 'right' },
        { key: 'unmatchedCount', label: t('admin.commerce.payments.col.unmatched', 'Unmatched'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
      ],
      
      searchFields: ['runNo', 'providerCode', 'reconciliationType', 'status', 'periodStart', 'periodEnd'],
      help: sectionHelp(t, 'reconciliationRuns', 6, 3),
    }),
    createPaymentListSection({
      id: 'refunds',
      title: t('admin.commerce.payments.refunds.title', 'Refunds'),
      description: t('admin.commerce.payments.refunds.desc', 'Operator-initiated refunds with idempotent creation, retry of failed refunds, and amount-bounded processing.'),
      icon: <Undo2 className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: backendPaymentsRefundsList,
      action: {
        label: t('admin.commerce.payments.refunds.create.action', 'Create refund'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'refund-create' }),
      },
      rowActions: [{
        label: t('admin.commerce.payments.refunds.detail.open', 'Details'),
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: (record) => setDetailRefundId(String(record.id ?? '')),
      }, {
        label: t('admin.commerce.payments.refunds.retry.action', 'Retry'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => String(record.status ?? '') === 'failed',
        onClick: (record) => setDialog({ kind: 'refund-retry', record }),
      }],
      columns: [
        { key: 'refundNo', label: t('admin.commerce.payments.col.refundNo', 'Refund No') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'paymentIntentId', label: t('admin.commerce.payments.col.paymentIntentId', 'Intent ID') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right', format: (value, record) => formatRefundAmount(value, String(record.currencyCode ?? '')) },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'reasonCode', label: t('admin.commerce.payments.col.reasonCode', 'Reason'), format: formatReasonCode },
        { key: 'requestedByType', label: t('admin.commerce.payments.col.requestedByType', 'Requested By'), format: formatRequestedByType },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['refundNo', 'orderId', 'paymentIntentId', 'status', 'reasonCode'],
      help: sectionHelp(t, 'refunds', 5, 3),
    }),
    ];
  }, [t, i18n]);

  async function submitMethodForm(values: PaymentMethodFormValues, state: Extract<PaymentDialogState, { kind: 'method-create' } | { kind: 'method-edit' }>) {
    if (state.kind === 'method-create') {
      await backendPaymentMethodsCreate(buildMethodCreateCommand(values));
    } else {
      await backendPaymentMethodsUpdate(String(state.record.methodKey ?? state.record.id ?? ''), buildMethodUpdateCommand(values));
    }
  }

  async function submitChannelForm(values: PaymentChannelFormValues) {
    await backendPaymentChannelsCreate(buildChannelCreateCommand(values));
  }

  async function submitRouteRuleForm(values: RouteRuleFormValues, state: Extract<PaymentDialogState, { kind: 'routeRule-create' } | { kind: 'routeRule-edit' }>) {
    if (state.kind === 'routeRule-create') {
      await backendPaymentRouteRulesCreate(buildRouteRuleCreateCommand(values));
    } else {
      await backendPaymentRouteRulesUpdate(String(state.record.id ?? ''), buildRouteRuleUpdateCommand(values));
    }
  }

  async function submitReconciliationForm(values: ReconciliationRunFormValues) {
    await backendPaymentReconciliationRunsCreate(buildReconciliationRunCreateCommand(values));
  }

  async function submitRefundCreateForm(values: RefundCreateFormValues) {
    await backendPaymentRefundsCreate(buildRefundCreateCommand(values), values.idempotencyKey);
  }

  async function submitRefundRetryForm(values: RefundRetryFormValues, state: Extract<PaymentDialogState, { kind: 'refund-retry' }>) {
    await backendPaymentRefundsRetry(String(state.record.id ?? ''), buildRefundRetryCommand(values), values.idempotencyKey);
  }

  async function runDialogAction(action: () => Promise<unknown>, successText: string, errorText: string) {
    setSaving(true);
    setMessage(null);
    try {
      await action();
      setDialog(null);
      setRefreshKey((value) => value + 1);
      setMessage({ kind: 'success', text: successText });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error && error.message ? error.message : errorText });
    } finally {
      setSaving(false);
    }
  }

  async function resolveSandboxProviderAccountId(providerCode: string): Promise<string> {
    const accounts = readAdminResourceRecordList(await backendPaymentProviderAccountsList());
    const devAccounts = accounts.filter((account) => {
      const environment = String(account.environment ?? '');
      return environment === 'development' || environment === 'sandbox';
    });
    const preferred = devAccounts.find((account) => String(account.providerCode ?? '') === providerCode)
      ?? devAccounts[0];
    const accountId = preferred ? String(preferred.id ?? '') : '';
    if (!accountId) {
      throw new Error(t('admin.commerce.payments.sandboxTrigger.error.noAccount', 'No development or sandbox provider account found. Create one in the provider accounts workspace first.'));
    }
    return accountId;
  }

  async function runSandboxTrigger(state: Extract<PaymentDialogState, { kind: 'sandbox-trigger-intent' } | { kind: 'sandbox-trigger-attempt' }>) {
    const providerCode = String(state.record.providerCode ?? '');
    const providerAccountId = await resolveSandboxProviderAccountId(providerCode);
    let outTradeNo: string | undefined;
    if (state.kind === 'sandbox-trigger-intent') {
      const attempts = readAdminResourceRecordList(
        await backendPaymentsAttemptsList({ paymentIntentId: String(state.record.id ?? '') }),
      );
      const firstAttempt = attempts[0];
      if (firstAttempt && firstAttempt.outTradeNo) {
        outTradeNo = String(firstAttempt.outTradeNo);
      }
    } else if (state.record.outTradeNo) {
      outTradeNo = String(state.record.outTradeNo);
    }
    await backendPaymentDevSandboxTrigger({
      providerAccountId,
      eventType: 'sdkwork.sandbox.triggered',
      ...(state.record.amount ? { amount: String(state.record.amount) } : {}),
      ...(state.record.currencyCode ? { currencyCode: String(state.record.currencyCode) } : {}),
      ...(outTradeNo ? { outTradeNo } : {}),
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-payments-layout>
      {message ? (
        <div className={message.kind === 'success'
          ? 'flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          : 'flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'}
          role="status"
        >
          {message.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdminResourceCenter
          activeSectionId={activeSectionId}
          emptyDescription={t('admin.commerce.payments.emptyDesc', 'Adjust the search query or reload the current section.')}
          emptyTitle={t('admin.commerce.payments.empty', 'No payment records')}
          errorTitle={t('admin.commerce.payments.error', 'Payment data could not be loaded')}
          helpCloseLabel={t('admin.commerce.payments.help.close', 'Close')}
          helpLabel={t('admin.commerce.payments.help.label', 'How to use')}
          helpNotesLabel={t('admin.commerce.payments.help.notes', 'Notes')}
          initialSectionId={DEFAULT_PAYMENT_RESOURCE_SECTION_ID}
          key={activeSectionId}
          loadingTitle={t('admin.commerce.payments.loading', 'Loading payment records...')}
          paginationNextLabel={t('admin.commerce.payments.pagination.next', 'Next page')}
          paginationPageLabel={t('admin.commerce.payments.pagination.page', 'Page')}
          paginationPageSizeLabel={t('admin.commerce.payments.pagination.pageSize', 'Rows')}
          paginationPreviousLabel={t('admin.commerce.payments.pagination.previous', 'Previous page')}
          paginationShowingLabel={t('admin.commerce.payments.pagination.showing', 'Showing')}
          recordActionColumnLabel={t('admin.commerce.payments.action', 'Action')}
          refreshKey={refreshKey}
          reloadLabel={t('admin.commerce.payments.reload', 'Reload')}
          retryLabel={t('admin.commerce.payments.retry', 'Retry')}
          searchPlaceholder={t('admin.commerce.payments.searchPlaceholder', 'Search records')}
          sections={paymentSections}
          showSectionNavigation={false}
          tableViewportDataAttribute="admin-payments-table-viewport"
        />
      </div>

      {dialog?.kind === 'method-create' ? (
        <MethodFormDialog
          mode="create"
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitMethodForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'method-edit' ? (
        <MethodFormDialog
          mode="edit"
          initial={methodFormValuesFromRecord(dialog.record)}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitMethodForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'method-test-payment' ? (
        <PaymentTestDialog
          onClose={() => setDialog(null)}
          record={dialog.record}
        />
      ) : null}
      {dialog?.kind === 'channel-create' ? (
        <ChannelFormDialog
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitChannelForm(values),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'routeRule-create' ? (
        <RouteRuleFormDialog
          mode="create"
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitRouteRuleForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'routeRule-edit' ? (
        <RouteRuleFormDialog
          mode="edit"
          initial={routeRuleFormValuesFromRecord(dialog.record)}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitRouteRuleForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'reconciliation-create' ? (
        <ReconciliationRunFormDialog
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitReconciliationForm(values),
            t('admin.commerce.payments.operationSuccess', 'Operation completed successfully.'),
            t('admin.commerce.payments.operationError', 'Operation failed.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'refund-create' ? (
        <RefundCreateDialog
          initialIntentId={dialog.intentId}
          initialIntentNo={dialog.intentNo}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitRefundCreateForm(values),
            t('admin.commerce.payments.refunds.create.success', 'Refund submitted successfully.'),
            t('admin.commerce.payments.refunds.create.error', 'Refund could not be submitted.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'refund-retry' ? (
        <RefundRetryDialog
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitRefundRetryForm(values, dialog),
            t('admin.commerce.payments.refunds.retry.success', 'Refund retry submitted successfully.'),
            t('admin.commerce.payments.refunds.retry.error', 'Refund retry could not be submitted.'),
          )}
          record={dialog.record}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'routeRule-delete' ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.routeRules.delete.confirm', 'Delete')}
          description={t('admin.commerce.payments.routeRules.delete.desc', 'Delete route rule {{ruleNo}}? This action cannot be undone.', {
            ruleNo: String(dialog.record.ruleNo ?? dialog.record.id ?? ''),
          })}
          onClose={() => setDialog(null)}
          onConfirm={() => void runDialogAction(
            () => backendPaymentRouteRulesDelete(String(dialog.record.id ?? '')),
            t('admin.commerce.payments.operationSuccess', 'Operation completed successfully.'),
            t('admin.commerce.payments.operationError', 'Operation failed.'),
          )}
          processing={saving}
          title={t('admin.commerce.payments.routeRules.delete.title', 'Delete route rule?')}
        />
      ) : null}
      {dialog?.kind === 'webhook-replay' ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.webhookEvents.replay.confirm', 'Replay')}
          description={t('admin.commerce.payments.webhookEvents.replay.desc', 'Replay webhook event {{eventId}}? This action cannot be undone.', {
            eventId: String(dialog.record.eventId ?? dialog.record.id ?? ''),
          })}
          onClose={() => setDialog(null)}
          onConfirm={() => void runDialogAction(
            () => backendPaymentWebhookEventsReplay(String(dialog.record.eventId ?? dialog.record.id ?? '')),
            t('admin.commerce.payments.webhookEvents.replay.success', 'Webhook event replayed successfully.'),
            t('admin.commerce.payments.webhookEvents.replay.error', 'Webhook event replay failed.'),
          )}
          processing={saving}
          title={t('admin.commerce.payments.webhookEvents.replay.title', 'Replay webhook event?')}
        />
      ) : null}

      {dialog?.kind === 'sandbox-trigger-intent' || dialog?.kind === 'sandbox-trigger-attempt' ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.sandboxTrigger.confirm', 'Simulate')}
          description={t('admin.commerce.payments.sandboxTrigger.desc', 'Enqueue a sandbox success callback for {{reference}} against a development or sandbox provider account. The order gateway processes it and marks the payment as succeeded.', {
            reference: String(dialog.record.attemptNo ?? dialog.record.paymentIntentNo ?? dialog.record.id ?? ''),
          })}
          onClose={() => setDialog(null)}
          onConfirm={() => void runDialogAction(
            () => runSandboxTrigger(dialog),
            t('admin.commerce.payments.sandboxTrigger.success', 'Sandbox success callback enqueued.'),
            t('admin.commerce.payments.sandboxTrigger.error', 'Sandbox callback could not be enqueued.'),
          )}
          processing={saving}
          title={t('admin.commerce.payments.sandboxTrigger.title', 'Simulate success callback?')}
        />
      ) : null}

      <IntentDetailDrawer
        intentId={detailIntentId}
        onClose={() => setDetailIntentId(null)}
      />
      <RefundDetailDrawer
        refundId={detailRefundId}
        onClose={() => setDetailRefundId(null)}
      />
    </div>
  );
}

/**
 * Loads base-data records once and maps them to select options. Returns
 * `null` while loading or when the sdkwork-appbase base-data service is
 * unreachable; the host passes an empty array in that case so the form
 * degrades to free-text country/currency inputs.
 */
function usePaymentProviderAdminCapabilities(): PaymentProviderAdminCapabilities {
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  return useMemo(() => ({
    canCreateProviderAccount: hasPortalPermission(
      'commerce.payments.provider_accounts.create',
      permissionScope,
    ),
    canUpdateProviderAccount: hasPortalPermission(
      'commerce.payments.provider_accounts.update',
      permissionScope,
    ),
    canDeleteProviderAccount: hasPortalPermission(
      'commerce.payments.provider_accounts.delete',
      permissionScope,
    ),
    canTestProviderAccount: hasPortalPermission(
      'commerce.payments.provider_accounts.test',
      permissionScope,
    ),
    canRotateProviderCredentials: hasPortalPermission(
      'commerce.payments.provider_accounts.credentials.rotate',
      permissionScope,
    ),
    canCreateSubMerchant: hasPortalPermission(
      'commerce.payments.sub_merchants.create',
      permissionScope,
    ),
    canUpdateSubMerchant: hasPortalPermission(
      'commerce.payments.sub_merchants.update',
      permissionScope,
    ),
    canDeleteSubMerchant: hasPortalPermission(
      'commerce.payments.sub_merchants.delete',
      permissionScope,
    ),
  }), [permissionScope]);
}

function createPaymentListSection<TTab extends PaymentResourceTab>(
  section: Omit<AdminResourceSection<TTab, PaymentsAdminGroup>, 'load' | 'pagination'> & {
    load: (params?: AdminResourceLoadParams) => Promise<unknown>;
  },
): AdminResourceSection<TTab, PaymentsAdminGroup> {
  return {
    ...section,
    load: (params) => section.load(params),
    pagination: PAYMENT_LIST_PAGINATION,
  };
}

function formatArrayCell(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(', ');
  }
  return value === null || value === undefined ? '-' : String(value);
}

/**
 * Resolves a localized reference-data name from the backend-provided
 * `*I18n` locale map (`{"zh-CN": "...", "en-US": "..."}`) using the current
 * i18n language, falling back to the base display name when the locale key
 * is absent. Locale candidates try the full tag first, then the language
 * part (`zh-CN` -> `zh`).
 */
function formatLocalizedName(
  i18n: { language?: string },
  record: AdminResourceRecord,
  i18nKey: string,
  fallback: unknown,
): string {
  const fallbackText = fallback === null || fallback === undefined ? '-' : String(fallback);
  const map = record[i18nKey];
  if (!map || typeof map !== 'object') {
    return fallbackText;
  }
  const language = i18n.language ?? '';
  const candidates = [language, language.split('-')[0]];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    const localized = (map as Record<string, unknown>)[candidate];
    if (typeof localized === 'string' && localized.trim()) {
      return localized;
    }
  }
  return fallbackText;
}

type PaymentTranslate = ReturnType<typeof useTranslation>['t'];

function formatEnumCell(t: PaymentTranslate, keyPrefix: string): (value: unknown) => string {
  return (value) => formatPaymentEnumValue(t, keyPrefix, value);
}

function formatEnumArrayCell(t: PaymentTranslate, keyPrefix: string): (value: unknown) => string {
  return (value) => {
    if (!Array.isArray(value)) {
      return formatPaymentEnumValue(t, keyPrefix, value);
    }
    return value.map((item) => formatPaymentEnumValue(t, keyPrefix, item)).join(', ');
  };
}

function formatPaymentEnumValue(t: PaymentTranslate, keyPrefix: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const raw = String(value);
  return t(`${keyPrefix}.${raw}`, { defaultValue: raw });
}

function sectionHelp(t: PaymentTranslate, prefix: string, stepCount: number, noteCount: number): AdminResourceHelpContent {
  return {
    title: t(`admin.commerce.payments.help.${prefix}.title`),
    description: t(`admin.commerce.payments.help.${prefix}.desc`),
    steps: Array.from({ length: stepCount }, (_, index) => t(`admin.commerce.payments.help.${prefix}.step${index + 1}`)),
    notes: Array.from({ length: noteCount }, (_, index) => t(`admin.commerce.payments.help.${prefix}.note${index + 1}`)),
  };
}
