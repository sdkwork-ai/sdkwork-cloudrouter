import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, BarChart3, CheckCircle2, CreditCard, Download, Eye, Pencil, Plus, Power, PowerOff, QrCode, Receipt, RotateCcw, ShieldCheck, Trash2, Undo2 } from 'lucide-react';
import {
  AdminResourceCenter,
  AdminResourceHelpButton,
  readAdminResourceRecordList,
  resolveProblemMessage,
  type AdminResourceHelpContent,
  type AdminResourceListQuery,
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
  backendPaymentChannelsDelete,
  backendPaymentChannelsUpdate,
  backendPaymentsChannelsListFiltered,
  backendPaymentDevSandboxTrigger,
  backendPaymentMethodsCreate,
  backendPaymentMethodsUpdate,
  backendPaymentProvidersUpdate,
  backendPaymentReconciliationRunsCreate,
  backendPaymentRefundsCreate,
  backendPaymentRefundsRetry,
  backendPaymentRouteRulesCreate,
  backendPaymentRouteRulesDelete,
  backendPaymentRouteRulesUpdate,
  backendPaymentWebhookEventsReplay,
  backendPaymentsAttemptsList,
  backendPaymentsAttemptsListFiltered,
  backendPaymentsChannelsList,
  backendPaymentsIntentsList,
  backendPaymentsMethodsList,
  backendPaymentsProvidersListFiltered,
  backendPaymentsReconciliationRunsListFiltered,
  backendPaymentsRefundsList,
  backendPaymentsRouteRulesList,
  backendPaymentsWebhookEventsListFiltered,
} from './paymentsService';
import {
  createPaymentChannelColumns,
  createPaymentMethodColumns,
  createPaymentProviderColumns,
  createPaymentRouteRuleColumns,
  PaymentProviderCompactCell,
  type RouteRuleChannelReference,
} from './components/PaymentProviderCells';
import {
  formatLocalizedName,
  formatPaymentDateTime as formatDateTime,
  formatPaymentEnumValue,
  type PaymentTranslate,
} from './paymentFormat';
import { formatPaymentAmount } from './paymentMoney';
import {
  buildPaymentRecordListQuery,
  buildRefundListQuery,
  PAYMENT_INTENT_STATUSES,
  PAYMENT_RECORD_EXPORT_LIMIT,
  RECONCILIATION_RUN_STATUSES,
  REFUND_REASON_CODES,
  REFUND_STATUSES,
  WEBHOOK_EVENT_STATUSES,
} from './services/paymentRecordsQuery';
import {
  buildCsvContent,
  buildCsvFileName,
  buildPaymentRecordCsvRows,
  buildRefundCsvRows,
  collectPaymentRecords,
  collectRefundRecords,
  downloadCsvFile,
  type PaymentRecordRowFormatting,
} from './services/paymentRecordsExport';
import {
  buildChannelCreateCommand,
  buildChannelUpdateCommand,
  buildMethodCreateCommand,
  buildMethodUpdateCommand,
  buildProviderUpdateCommand,
  buildReconciliationRunCreateCommand,
  buildRouteRuleCreateCommand,
  buildRouteRuleUpdateCommand,
  channelFormValuesFromRecord,
  methodFormValuesFromRecord,
  providerFormValuesFromRecord,
  routeRuleFormValuesFromRecord,
  PROVIDER_CODES,
  SCENE_OPTIONS,
  STATUS_OPTIONS,
  ChannelFormDialog,
  MethodFormDialog,
  PaymentConfirmDialog,
  ProviderFormDialog,
  ProviderStatusDialog,
  ReconciliationRunFormDialog,
  RouteRuleFormDialog,
  type PaymentChannelFormValues,
  type PaymentMethodFormValues,
  type PaymentProviderFormValues,
  type ReconciliationRunFormValues,
  type RouteRuleFormValues,
} from './forms/PaymentMaintenanceDialogs';
import {
  buildRefundCreateCommand,
  buildRefundRetryCommand,
  RefundCreateDialog,
  RefundRetryDialog,
  type RefundCreateFormValues,
  type RefundRetryFormValues,
} from './forms/RefundDialogs';
import { IntentDetailDrawer } from './components/IntentDetailDrawer';
import { RefundDetailDrawer } from './components/RefundDetailDrawer';
import { PaymentRecordsSummary } from './components/PaymentRecordsSummary';
import { PaymentTestDialog } from './components/PaymentTestDialog';
import { PaymentDomainSettingsAdmin } from './components/PaymentDomainSettingsAdmin';

type PaymentsAdminTab =
  | 'providers'
  | 'providerAccounts'
  | 'domainSettings'
  | 'methods'
  | 'channels'
  | 'routeRules'
  | 'intents'
  | 'attempts'
  | 'webhookEvents'
  | 'reconciliationRuns'
  | 'refunds';

type PaymentResourceTab = Exclude<PaymentsAdminTab, 'providerAccounts' | 'domainSettings'>;
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
    || sectionId === 'domainSettings'
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
  if (activeSectionId === 'domainSettings') {
    return <PaymentDomainSettingsAdmin />;
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
  | { kind: 'provider-edit'; record: AdminResourceRecord }
  | { kind: 'provider-status'; record: AdminResourceRecord }
  | { kind: 'method-create' }
  | { kind: 'method-edit'; record: AdminResourceRecord }
  | { kind: 'method-test-payment'; record: AdminResourceRecord }
  | { kind: 'channel-create' }
  | { kind: 'channel-edit'; record: AdminResourceRecord }
  | { kind: 'channel-delete'; record: AdminResourceRecord }
  | { kind: 'routeRule-create' }
  | { kind: 'routeRule-edit'; record: AdminResourceRecord }
  | { kind: 'routeRule-delete'; record: AdminResourceRecord }
  | { kind: 'reconciliation-create' }
  | { kind: 'webhook-replay'; record: AdminResourceRecord }
  | { kind: 'sandbox-trigger-intent'; record: AdminResourceRecord }
  | { kind: 'sandbox-trigger-attempt'; record: AdminResourceRecord }
  | { kind: 'refund-create'; record?: AdminResourceRecord }
  | { kind: 'refund-retry'; record: AdminResourceRecord }
  | null;

const PENDING_PAYMENT_STATUSES = new Set(['created', 'pending', 'processing']);

/**
 * Route rules only carry a `channelId`. Enriching each record with the resolved
 * channel keeps the search box honest: an operator who types a channel name
 * expects the rule that targets it, and the table cell reads the same fields.
 */
function withResolvedChannels<T>(result: T, channelById: ReadonlyMap<string, RouteRuleChannelReference>): T {
  if (!result || typeof result !== 'object') return result;
  const payload = result as unknown as { items?: unknown };
  if (!Array.isArray(payload.items)) return result;
  const items = payload.items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const record = item as AdminResourceRecord;
    const channel = channelById.get(String(record.channelId ?? ''));
    if (!channel) return record;
    return {
      ...record,
      channelName: channel.channelName ?? '',
      channelNo: channel.channelNo,
      providerCode: channel.providerCode,
    };
  });
  return { ...(result as unknown as Record<string, unknown>), items } as T;
}

/**
 * Payment method keys that can drive the one-cent test payment, in three
 * classes: scan-to-pay QR methods (`wechat_native` 鈫?WeChat Native
 * `code_url`, `alipay_qr` 鈫?Alipay precreate `qr_code`), web cashier
 * methods (`alipay_wap`/`alipay_pc` 鈫?Alipay H5/PC cashier redirect or
 * form), and Stripe card methods (`stripe_*` 鈫?client-secret card
 * collection in the dialog). Other products return SDK invocation
 * payloads, require payer identifiers (openid/buyer_id), or have no
 * checkout at all (sandbox), so they must not show the one-cent test
 * action. The local sandbox (`sandbox_test`) is testable through the
 * simulated success callback and needs no provider credentials.
 */
const QR_TEST_METHOD_KEYS = new Set([
  'wechat_native',
  'alipay_qr',
  'alipay_wap',
  'alipay_pc',
  'stripe_card',
  'stripe_apple_pay',
  'stripe_google_pay',
  'stripe_alipay',
  'stripe_wechat_pay',
  'sandbox_test',
]);

function PaymentResourceAdmin({ activeSectionId }: { activeSectionId: PaymentResourceTab }) {
  const { t, i18n } = useTranslation();
  const capabilities = usePaymentMaintenanceCapabilities();
  const [dialog, setDialog] = useState<PaymentDialogState>(null);
  const [detailIntentId, setDetailIntentId] = useState<string | null>(null);
  const [detailRefundId, setDetailRefundId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Payment method catalogue, loaded once: it feeds the channels filter and the
  // readable method references used by the channels and route-rule lists (which
  // only store a method id / channel id).
  const [methodById, setMethodById] = useState<ReadonlyMap<string, { label: string; methodKey: string }>>(
    () => new Map(),
  );
  // Channel catalogue, loaded once, so a route rule can render its target
  // channel by name and brand mark instead of a bare UUID.
  const [channelById, setChannelById] = useState<ReadonlyMap<string, RouteRuleChannelReference>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    void backendPaymentsMethodsList({ page: 1, pageSize: 200 }).then((result) => {
      if (cancelled) return;
      const records = readAdminResourceRecordList(result);
      const next = new Map<string, { label: string; methodKey: string }>();
      for (const record of records) {
        const id = String(record.id ?? '');
        if (!id) continue;
        const methodKey = String(record.methodKey ?? record.id ?? '');
        next.set(id, {
          label: formatLocalizedName(i18n, record, 'displayNameI18n', record.displayName) || methodKey,
          methodKey,
        });
      }
      setMethodById(next);
    }).catch(() => {
      // Reference data degrades to raw ids; the lists themselves still load.
    });
    void backendPaymentsChannelsList({ page: 1, pageSize: 200 }).then((result) => {
      if (cancelled) return;
      const records = readAdminResourceRecordList(result);
      const next = new Map<string, RouteRuleChannelReference>();
      for (const record of records) {
        const id = String(record.id ?? '');
        if (!id) continue;
        next.set(id, {
          channelName: formatLocalizedName(i18n, record, 'channelNameI18n', record.channelName) || undefined,
          channelNo: String(record.channelNo ?? ''),
          providerCode: String(record.providerCode ?? ''),
        });
      }
      setChannelById(next);
    }).catch(() => {
      // Route rules fall back to the raw channel id when this fails.
    });
    return () => {
      cancelled = true;
    };
  }, [i18n]);

  const methodOptions = useMemo<readonly { value: string; label: string }[]>(
    () => [...methodById.entries()].map(([value, method]) => ({ value, label: method.methodKey })),
    [methodById],
  );

  const paymentSections = useMemo<AdminResourceSection<PaymentResourceTab, PaymentsAdminGroup>[]>(() => {
    const formatStatus = formatEnumCell(t, 'admin.commerce.payments.value.status');
    const formatReasonCode = formatEnumCell(t, 'admin.commerce.payments.value.reasonCode');
    const formatRequestedByType = formatEnumCell(t, 'admin.commerce.payments.value.requestedByType');
    const formatReconciliationType = formatEnumCell(t, 'admin.commerce.payments.value.reconciliationType');
    return [
    createPaymentListSection({
      id: 'providers',
      title: t('admin.commerce.payments.providers.title', 'Payment Providers'),
      description: t(
        'admin.commerce.payments.providers.desc',
        'Cloud Router provider inventory with operator-managed availability: display names, sort order, and enable/disable state.',
      ),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: (params) => backendPaymentsProvidersListFiltered(params?.filters),
      filters: [{
        key: 'status',
        label: t('admin.commerce.payments.providers.filter.status', 'Status'),
        placeholder: t('admin.commerce.payments.providers.filter.allStatuses', 'All statuses'),
        options: STATUS_OPTIONS.map((code) => ({
          value: code,
          label: t(`admin.commerce.payments.value.status.${code}`, code),
        })),
      }],
      rowActions: [{
        label: t('admin.commerce.payments.providers.edit', 'Edit'),
        icon: <Pencil className="h-3.5 w-3.5" />,
        isVisible: () => capabilities.canUpdatePaymentProvider,
        onClick: (record) => setDialog({ kind: 'provider-edit', record }),
      }, {
        label: t('admin.commerce.payments.providers.disable.action', 'Disable'),
        icon: <PowerOff className="h-3.5 w-3.5" />,
        isVisible: (record) => capabilities.canUpdatePaymentProvider
          && String(record.status ?? '') === 'active',
        onClick: (record) => setDialog({ kind: 'provider-status', record }),
      }, {
        label: t('admin.commerce.payments.providers.enable.action', 'Enable'),
        icon: <Power className="h-3.5 w-3.5" />,
        isVisible: (record) => capabilities.canUpdatePaymentProvider
          && String(record.status ?? '') !== 'active',
        onClick: (record) => setDialog({ kind: 'provider-status', record }),
      }],
      columns: createPaymentProviderColumns(t),
      
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
      action: capabilities.canCreatePaymentMethod ? {
        label: t('admin.commerce.payments.methods.create.title', 'Create payment method'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'method-create' }),
      } : undefined,
      rowActions: [{
        label: t('admin.commerce.payments.methods.edit', 'Edit'),
        icon: <Pencil className="h-3.5 w-3.5" />,
        isVisible: () => capabilities.canUpdatePaymentMethod,
        onClick: (record) => setDialog({ kind: 'method-edit', record }),
      }, {
        label: t('admin.commerce.payments.methods.testPayment.action', 'One-cent test'),
        icon: <QrCode className="h-3.5 w-3.5" />,
        isVisible: (record) => QR_TEST_METHOD_KEYS.has(String(record.methodKey ?? ''))
          && String(record.status ?? '') === 'active',
        onClick: (record) => setDialog({ kind: 'method-test-payment', record }),
      }],
      columns: createPaymentMethodColumns({ t, i18n }),
      
      searchFields: ['methodKey', 'displayName', 'providerCode', 'scope', 'currencyCode', 'status'],
      help: sectionHelp(t, 'methods', 6, 3),
    }),
    createPaymentListSection({
      id: 'channels',
      title: t('admin.commerce.payments.channels.title', 'Payment Channels'),
      description: t('admin.commerce.payments.channels.desc', 'Country, currency, scene, and provider-account routing channels.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: (params) => backendPaymentsChannelsListFiltered((params as { filters?: Record<string, string> } | undefined)?.filters),
      filters: [
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.channels.filter.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.channels.filter.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'methodId',
          label: t('admin.commerce.payments.channels.filter.method', 'Payment method'),
          placeholder: t('admin.commerce.payments.channels.filter.allMethods', 'All methods'),
          options: methodOptions,
        },
        {
          key: 'sceneCode',
          label: t('admin.commerce.payments.channels.filter.scene', 'Scene'),
          placeholder: t('admin.commerce.payments.channels.filter.allScenes', 'All scenes'),
          options: SCENE_OPTIONS.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.scene.${code}`, code),
          })),
        },
        {
          key: 'status',
          label: t('admin.commerce.payments.channels.filter.status', 'Status'),
          placeholder: t('admin.commerce.payments.channels.filter.allStatuses', 'All statuses'),
          options: STATUS_OPTIONS.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
      ],
      action: capabilities.canCreatePaymentChannel ? {
        label: t('admin.commerce.payments.channels.create.title', 'Create payment channel'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'channel-create' }),
      } : undefined,
      rowActions: [
        {
          label: t('admin.commerce.payments.channels.edit.action', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          isVisible: () => capabilities.canUpdatePaymentChannel,
          onClick: (record) => setDialog({ kind: 'channel-edit', record }),
        },
        {
          label: t('admin.commerce.payments.channels.delete.action', 'Delete'),
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: 'danger',
          isVisible: () => capabilities.canDeletePaymentChannel,
          onClick: (record) => setDialog({ kind: 'channel-delete', record }),
        },
      ],
      columns: createPaymentChannelColumns({ t, i18n, methodLabelById: methodById }),
      
      searchFields: ['channelNo', 'channelName', 'methodId', 'providerAccountId', 'countryCode', 'currencyCode', 'sceneCode', 'providerCode', 'status'],
      help: sectionHelp(t, 'channels', 6, 3),
    }),
    createPaymentListSection({
      id: 'routeRules',
      title: t('admin.commerce.payments.routeRules.title', 'Route Rules'),
      description: t('admin.commerce.payments.routeRules.desc', 'Payment route rules by market, method, currency, priority, and fallback.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: (params) =>
        backendPaymentsRouteRulesList(params).then((result) => withResolvedChannels(result, channelById)),
      action: capabilities.canCreateRouteRule ? {
        label: t('admin.commerce.payments.routeRules.create.title', 'Create route rule'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'routeRule-create' }),
      } : undefined,
      rowActions: [
        {
          label: t('admin.commerce.payments.routeRules.edit', 'Edit'),
          icon: <Pencil className="h-3.5 w-3.5" />,
          isVisible: () => capabilities.canUpdateRouteRule,
          onClick: (record) => setDialog({ kind: 'routeRule-edit', record }),
        },
        {
          label: t('admin.commerce.payments.routeRules.delete', 'Delete'),
          icon: <Trash2 className="h-3.5 w-3.5" />,
          tone: 'danger',
          isVisible: () => capabilities.canDeleteRouteRule,
          onClick: (record) => setDialog({ kind: 'routeRule-delete', record }),
        },
      ],
      columns: createPaymentRouteRuleColumns({ t, channelById }),
      
      searchFields: ['ruleNo', 'purchaseType', 'countryCode', 'currencyCode', 'clientPlatform', 'channelId', 'channelName', 'channelNo', 'providerCode', 'status'],
      help: sectionHelp(t, 'routeRules', 6, 3),
    }),
    createPaymentListSection({
      id: 'intents',
      title: t('admin.commerce.payments.intents.title', 'Payment records'),
      description: t(
        'admin.commerce.payments.intents.desc',
        'Every payment created from orders, memberships, recharge, and wallet flows. Filter by status, provider, currency, and creation window, search by intent number, order number, or owner, then open a record to inspect its attempts and refunds.',
      ),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: (params) => backendPaymentsIntentsList(buildPaymentRecordListQuery(params)),
      searchMode: 'server',
      searchPlaceholder: t('admin.commerce.payments.intents.searchPlaceholder', 'Search intent no, order no, or owner user'),
      filters: [
        {
          key: 'status',
          label: t('admin.commerce.payments.filters.status', 'Status'),
          placeholder: t('admin.commerce.payments.filters.allStatuses', 'All statuses'),
          options: PAYMENT_INTENT_STATUSES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.filters.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.filters.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'currencyCode',
          kind: 'text',
          label: t('admin.commerce.payments.filters.currency', 'Currency'),
          placeholder: t('admin.commerce.payments.filters.currencyPlaceholder', 'Currency (e.g. CNY)'),
          maxLength: 3,
        },
        {
          key: 'createdAfter',
          kind: 'datetime-local',
          label: t('admin.commerce.payments.filters.createdFrom', 'Created from'),
        },
        {
          key: 'createdBefore',
          kind: 'datetime-local',
          label: t('admin.commerce.payments.filters.createdTo', 'Created to'),
        },
      ],
      resolveToolbarActions: (query) => [{
        label: t('admin.commerce.payments.export.action', 'Export CSV'),
        icon: <Download className="h-4 w-4" />,
        onClick: () => void runRecordExport('paymentRecords', query),
      }],
      renderSummary: (query) => <PaymentRecordsSummary kind="paymentRecords" query={query} />,
      rowActions: [{
        label: t('admin.commerce.payments.intents.detail.open', 'Details'),
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: (record) => setDetailIntentId(String(record.id ?? '')),
      }, {
        label: t('admin.commerce.payments.refunds.create.intentAction', 'Refund'),
        icon: <Undo2 className="h-3.5 w-3.5" />,
        isVisible: (record) => capabilities.canCreateRefund
          && String(record.status ?? '') === 'succeeded',
        onClick: (record) => setDialog({
          kind: 'refund-create',
          record,
        }),
      }, {
        label: t('admin.commerce.payments.sandboxTrigger.action', 'Simulate success callback'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => capabilities.canTriggerSandbox
          && PENDING_PAYMENT_STATUSES.has(String(record.status ?? '')),
        onClick: (record) => setDialog({ kind: 'sandbox-trigger-intent', record }),
      }],
      columns: [
        { key: 'paymentIntentNo', label: t('admin.commerce.payments.col.paymentIntentNo', 'Intent No') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'paymentMethod', label: t('admin.commerce.payments.col.paymentMethod', 'Payment Method') },
        { key: 'ownerUserId', label: t('admin.commerce.payments.col.ownerUserId', 'Owner User') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider'), render: (value) => <PaymentProviderCompactCell value={value} /> },
        {
          key: 'amount',
          label: t('admin.col.amount', 'Amount'),
          align: 'right',
          format: (value, record) => formatPaymentAmount(value, record.currencyCode, i18n.language),
        },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'createdAt', label: t('admin.col.created', 'Created'), format: formatDateTime },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated'), format: formatDateTime },
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
      load: (params) => backendPaymentsAttemptsListFiltered(params?.filters),
      filters: [
        {
          key: 'status',
          label: t('admin.commerce.payments.filters.status', 'Status'),
          placeholder: t('admin.commerce.payments.filters.allStatuses', 'All statuses'),
          options: PAYMENT_INTENT_STATUSES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.filters.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.filters.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'paymentIntentId',
          kind: 'text',
          label: t('admin.commerce.payments.filters.paymentIntentId', 'Intent ID'),
          placeholder: t('admin.commerce.payments.filters.paymentIntentIdPlaceholder', 'Payment intent ID'),
        },
      ],
      rowActions: [{
        label: t('admin.commerce.payments.sandboxTrigger.action', 'Simulate success callback'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => PENDING_PAYMENT_STATUSES.has(String(record.status ?? '')),
        onClick: (record) => setDialog({ kind: 'sandbox-trigger-attempt', record }),
      }],
      columns: [
        { key: 'attemptNo', label: t('admin.col.attempt', 'Attempt') },
        { key: 'paymentIntentId', label: t('admin.commerce.payments.col.paymentIntentId', 'Intent ID') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider'), render: (value) => <PaymentProviderCompactCell value={value} /> },
        { key: 'outTradeNo', label: t('admin.commerce.payments.col.outTradeNo', 'Out Trade No') },
        { key: 'providerTransactionId', label: t('admin.commerce.payments.col.providerTransactionId', 'Provider Transaction') },
        {
          key: 'amount',
          label: t('admin.col.amount', 'Amount'),
          align: 'right',
          format: (value, record) => formatPaymentAmount(value, record.currencyCode, i18n.language),
        },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'paidAt', label: t('admin.col.paid', 'Paid') },
        { key: 'createdAt', label: t('admin.col.created', 'Created'), format: formatDateTime },
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
      load: (params) => backendPaymentsWebhookEventsListFiltered(params?.filters),
      filters: [
        {
          key: 'status',
          label: t('admin.commerce.payments.filters.status', 'Status'),
          placeholder: t('admin.commerce.payments.filters.allStatuses', 'All statuses'),
          options: WEBHOOK_EVENT_STATUSES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.filters.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.filters.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'eventType',
          kind: 'text',
          label: t('admin.commerce.payments.filters.eventType', 'Event type'),
          placeholder: t('admin.commerce.payments.filters.eventTypePlaceholder', 'e.g. payment_intent.succeeded'),
        },
      ],
      rowActions: [{
        label: t('admin.commerce.payments.webhookEvents.replay', 'Replay'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        onClick: (record) => setDialog({ kind: 'webhook-replay', record }),
      }],
      columns: [
        { key: 'eventId', label: t('admin.col.event', 'Event') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider'), render: (value) => <PaymentProviderCompactCell value={value} /> },
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
      load: (params) => backendPaymentsReconciliationRunsListFiltered(params?.filters),
      filters: [
        {
          key: 'status',
          label: t('admin.commerce.payments.filters.status', 'Status'),
          placeholder: t('admin.commerce.payments.filters.allStatuses', 'All statuses'),
          options: RECONCILIATION_RUN_STATUSES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.filters.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.filters.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'providerAccountId',
          kind: 'text',
          label: t('admin.commerce.payments.filters.providerAccountId', 'Provider account'),
          placeholder: t('admin.commerce.payments.filters.providerAccountIdPlaceholder', 'Provider account ID'),
        },
      ],
      action: capabilities.canCreateReconciliationRun ? {
        label: t('admin.commerce.payments.reconciliationRuns.create.title', 'Create reconciliation run'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'reconciliation-create' }),
      } : undefined,
      columns: [
        { key: 'runNo', label: t('admin.col.run', 'Run') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider'), render: (value) => <PaymentProviderCompactCell value={value} /> },
        { key: 'reconciliationType', label: t('admin.commerce.payments.col.reconciliationType', 'Type'), format: formatReconciliationType },
        { key: 'periodStart', label: t('admin.commerce.payments.col.periodStart', 'Period Start') },
        { key: 'periodEnd', label: t('admin.commerce.payments.col.periodEnd', 'Period End') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'matchedCount', label: t('admin.commerce.payments.col.matched', 'Matched'), align: 'right' },
        { key: 'mismatchedCount', label: t('admin.commerce.payments.col.mismatched', 'Mismatched'), align: 'right' },
        { key: 'unmatchedCount', label: t('admin.commerce.payments.col.unmatched', 'Unmatched'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'createdAt', label: t('admin.col.created', 'Created'), format: formatDateTime },
      ],
      
      searchFields: ['runNo', 'providerCode', 'reconciliationType', 'status', 'periodStart', 'periodEnd'],
      help: sectionHelp(t, 'reconciliationRuns', 6, 3),
    }),
    createPaymentListSection({
      id: 'refunds',
      title: t('admin.commerce.payments.refunds.title', 'Refund records'),
      description: t(
        'admin.commerce.payments.refunds.desc',
        'Refunds issued against succeeded payments: idempotent creation, provider retry, and amount-bounded processing. Filter by status, provider, reason, currency, or creation window, and search by refund number or order number.',
      ),
      icon: <Undo2 className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: (params) => backendPaymentsRefundsList(buildRefundListQuery(params)),
      searchMode: 'server',
      searchPlaceholder: t('admin.commerce.payments.refunds.searchPlaceholder', 'Search refund no or order no'),
      filters: [
        {
          key: 'status',
          label: t('admin.commerce.payments.filters.status', 'Status'),
          placeholder: t('admin.commerce.payments.filters.allStatuses', 'All statuses'),
          options: REFUND_STATUSES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.status.${code}`, code),
          })),
        },
        {
          key: 'providerCode',
          label: t('admin.commerce.payments.filters.provider', 'Provider'),
          placeholder: t('admin.commerce.payments.filters.allProviders', 'All providers'),
          options: PROVIDER_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.provider.${code}`, code),
          })),
        },
        {
          key: 'reasonCode',
          label: t('admin.commerce.payments.filters.reasonCode', 'Reason'),
          placeholder: t('admin.commerce.payments.filters.allReasons', 'All reasons'),
          options: REFUND_REASON_CODES.map((code) => ({
            value: code,
            label: t(`admin.commerce.payments.value.reasonCode.${code}`, code),
          })),
        },
        {
          key: 'currencyCode',
          kind: 'text',
          label: t('admin.commerce.payments.filters.currency', 'Currency'),
          placeholder: t('admin.commerce.payments.filters.currencyPlaceholder', 'Currency (e.g. CNY)'),
          maxLength: 3,
        },
        {
          key: 'paymentIntentId',
          kind: 'text',
          label: t('admin.commerce.payments.filters.paymentIntentId', 'Intent ID'),
          placeholder: t('admin.commerce.payments.filters.paymentIntentIdPlaceholder', 'Payment intent ID'),
        },
        {
          key: 'createdAfter',
          kind: 'datetime-local',
          label: t('admin.commerce.payments.filters.createdFrom', 'Created from'),
        },
        {
          key: 'createdBefore',
          kind: 'datetime-local',
          label: t('admin.commerce.payments.filters.createdTo', 'Created to'),
        },
      ],
      resolveToolbarActions: (query) => [{
        label: t('admin.commerce.payments.export.action', 'Export CSV'),
        icon: <Download className="h-4 w-4" />,
        onClick: () => void runRecordExport('refunds', query),
      }],
      renderSummary: (query) => <PaymentRecordsSummary kind="refunds" query={query} />,
      action: capabilities.canCreateRefund ? {
        label: t('admin.commerce.payments.refunds.create.action', 'Create refund'),
        icon: <Plus className="h-4 w-4" />,
        onClick: () => setDialog({ kind: 'refund-create' }),
      } : undefined,
      rowActions: [{
        label: t('admin.commerce.payments.refunds.detail.open', 'Details'),
        icon: <Eye className="h-3.5 w-3.5" />,
        onClick: (record) => setDetailRefundId(String(record.id ?? '')),
      }, {
        label: t('admin.commerce.payments.refunds.retry.action', 'Retry'),
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        isVisible: (record) => capabilities.canRetryRefund && (() => {
          const status = String(record.status ?? '');
          // Failed refunds can be re-submitted; processing refunds (PSP
          // returned processing and no async notice arrived) can also be
          // retried 鈥?the backend queries the PSP first and reconciles.
          return status === 'failed' || status === 'processing';
        })(),
        onClick: (record) => setDialog({ kind: 'refund-retry', record }),
      }],
      columns: [
        { key: 'refundNo', label: t('admin.commerce.payments.col.refundNo', 'Refund No') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'paymentIntentId', label: t('admin.commerce.payments.col.paymentIntentId', 'Intent ID') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider'), render: (value) => <PaymentProviderCompactCell value={value} /> },
        {
          key: 'amount',
          label: t('admin.col.amount', 'Amount'),
          align: 'right',
          format: (value, record) => formatPaymentAmount(value, record.currencyCode, i18n.language),
        },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status'), format: formatStatus },
        { key: 'reasonCode', label: t('admin.commerce.payments.col.reasonCode', 'Reason'), format: formatReasonCode },
        { key: 'requestedByType', label: t('admin.commerce.payments.col.requestedByType', 'Requested By'), format: formatRequestedByType },
        { key: 'createdAt', label: t('admin.col.created', 'Created'), format: formatDateTime },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated'), format: formatDateTime },
      ],
      searchFields: ['refundNo', 'orderId', 'paymentIntentId', 'status', 'reasonCode'],
      help: sectionHelp(t, 'refunds', 5, 3),
    }),
    ];
  }, [t, i18n, capabilities, methodOptions, methodById, channelById]);

  async function submitMethodForm(values: PaymentMethodFormValues, state: Extract<PaymentDialogState, { kind: 'method-create' } | { kind: 'method-edit' }>) {
    if (state.kind === 'method-create') {
      await backendPaymentMethodsCreate(buildMethodCreateCommand(values));
    } else {
      await backendPaymentMethodsUpdate(String(state.record.methodKey ?? state.record.id ?? ''), buildMethodUpdateCommand(values));
    }
  }

  async function submitProviderForm(values: PaymentProviderFormValues, state: Extract<PaymentDialogState, { kind: 'provider-edit' }>) {
    await backendPaymentProvidersUpdate(String(state.record.id ?? ''), buildProviderUpdateCommand(values));
  }

  async function submitProviderStatusChange(state: Extract<PaymentDialogState, { kind: 'provider-status' }>, reason: string) {
    const targetStatus = String(state.record.status ?? '') === 'active' ? 'inactive' : 'active';
    await backendPaymentProvidersUpdate(String(state.record.id ?? ''), {
      status: targetStatus,
      reason,
    });
  }

  async function submitChannelForm(values: PaymentChannelFormValues, state: Extract<PaymentDialogState, { kind: 'channel-create' } | { kind: 'channel-edit' }>) {
    if (state.kind === 'channel-create') {
      await backendPaymentChannelsCreate(buildChannelCreateCommand(values));
    } else {
      // The channel id is the record's primary key; `channelNo` is the operator
      // facing number and is editable, so it must not be used for the update URL.
      await backendPaymentChannelsUpdate(String(state.record.id ?? state.record.channelId ?? ''), buildChannelUpdateCommand(values));
    }
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

  const exportingRef = useRef(false);

  const exportFormatting = useMemo<PaymentRecordRowFormatting>(() => ({
    formatAmount: (value, currencyCode) => formatPaymentAmount(value, currencyCode, i18n.language),
    formatDateTime: (value) => formatDateTime(value),
    translateStatus: (value) => formatPaymentEnumValue(t, 'admin.commerce.payments.value.status', value),
    translateReason: (value) => formatPaymentEnumValue(t, 'admin.commerce.payments.value.reasonCode', value),
    translateRequestedBy: (value) => formatPaymentEnumValue(t, 'admin.commerce.payments.value.requestedByType', value),
  }), [i18n.language, t]);

  /**
   * Exports the records that match the *current* filters (not just the visible
   * page) as CSV. Guarded against double submission: a second click while the
   * export walk is still running would download a duplicate file.
   */
  async function runRecordExport(kind: 'paymentRecords' | 'refunds', query: AdminResourceListQuery) {
    if (exportingRef.current) {
      return;
    }
    exportingRef.current = true;
    setMessage(null);
    try {
      if (kind === 'paymentRecords') {
        const result = await collectPaymentRecords(buildPaymentRecordListQuery(query));
        if (result.items.length === 0) {
          setMessage({ kind: 'error', text: t('admin.commerce.payments.export.empty', 'There is nothing to export for the current filters.') });
          return;
        }
        downloadCsvFile(
          buildCsvFileName('payment-records'),
          buildCsvContent(paymentRecordCsvHeaders(t), buildPaymentRecordCsvRows(result.items, exportFormatting)),
        );
        setMessage(exportResultMessage(t, result.items.length, result.truncated));
        return;
      }
      const result = await collectRefundRecords(buildRefundListQuery(query));
      if (result.items.length === 0) {
        setMessage({ kind: 'error', text: t('admin.commerce.payments.export.empty', 'There is nothing to export for the current filters.') });
        return;
      }
      downloadCsvFile(
        buildCsvFileName('refund-records'),
        buildCsvContent(refundCsvHeaders(t), buildRefundCsvRows(result.items, exportFormatting)),
      );
      setMessage(exportResultMessage(t, result.items.length, result.truncated));
    } catch (error) {
      setMessage({
        kind: 'error',
        text: resolveProblemMessage(error, t, t('admin.commerce.payments.export.error', 'Export failed.')),
      });
    } finally {
      exportingRef.current = false;
    }
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
      setMessage({ kind: 'error', text: resolveProblemMessage(error, t, errorText) });
    } finally {
      setSaving(false);
    }
  }

  async function resolveSandboxProviderAccountId(providerCode: string): Promise<string> {
    const accounts = readAdminResourceRecordList(await getCloudRouterPaymentBackendService().providerAccounts.list());
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
          clearFiltersLabel={t('admin.commerce.payments.clearFilters', 'Clear filters')}
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
          paginationTotalLabel={t('admin.commerce.payments.pagination.total', 'Total')}
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

      {dialog?.kind === 'provider-edit' ? (
        <ProviderFormDialog
          initial={providerFormValuesFromRecord(dialog.record)}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitProviderForm(values, dialog),
            t('admin.commerce.payments.operationSuccess', 'Operation completed successfully.'),
            t('admin.commerce.payments.providers.edit.error', 'Payment provider could not be updated.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'provider-status' ? (
        <ProviderStatusDialog
          onClose={() => setDialog(null)}
          onSubmit={(reason) => void runDialogAction(
            () => submitProviderStatusChange(dialog, reason),
            t('admin.commerce.payments.providers.status.success', 'Payment provider status updated successfully.'),
            t('admin.commerce.payments.providers.status.error', 'Payment provider status could not be updated.'),
          )}
          provider={dialog.record}
          saving={saving}
        />
      ) : null}
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
          mode="create"
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitChannelForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'channel-edit' ? (
        <ChannelFormDialog
          mode="edit"
          initial={channelFormValuesFromRecord(dialog.record)}
          onClose={() => setDialog(null)}
          onSubmit={(values) => void runDialogAction(
            () => submitChannelForm(values, dialog),
            t('admin.commerce.payments.saveSuccess', 'Payment configuration saved successfully.'),
            t('admin.commerce.payments.saveError', 'Payment configuration could not be saved.'),
          )}
          saving={saving}
        />
      ) : null}
      {dialog?.kind === 'channel-delete' ? (
        <PaymentConfirmDialog
          confirmLabel={t('admin.commerce.payments.channels.delete.confirm', 'Delete')}
          description={t('admin.commerce.payments.channels.delete.desc', 'Delete channel {{channelNo}}? This action cannot be undone.', {
            channelNo: String(dialog.record.channelNo ?? dialog.record.id ?? ''),
          })}
          onClose={() => setDialog(null)}
          onConfirm={() => void runDialogAction(
            () => backendPaymentChannelsDelete(String(dialog.record.id ?? '')),
            t('admin.commerce.payments.operationSuccess', 'Operation completed successfully.'),
            t('admin.commerce.payments.operationError', 'Operation failed.'),
          )}
          processing={saving}
          title={t('admin.commerce.payments.channels.delete.title', 'Delete payment channel?')}
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
          initialRecord={dialog.record}
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
type PaymentMaintenanceCapabilities = {
  canUpdatePaymentProvider: boolean;
  canCreatePaymentMethod: boolean;
  canUpdatePaymentMethod: boolean;
  canCreatePaymentChannel: boolean;
  canUpdatePaymentChannel: boolean;
  canDeletePaymentChannel: boolean;
  canCreateRouteRule: boolean;
  canUpdateRouteRule: boolean;
  canDeleteRouteRule: boolean;
  canCreateRefund: boolean;
  canRetryRefund: boolean;
  canCreateReconciliationRun: boolean;
  canTriggerSandbox: boolean;
  canTestWebhookSignature: boolean;
};

function usePaymentProviderAdminCapabilities(): PaymentProviderAdminCapabilities & PaymentMaintenanceCapabilities {
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
    // Maintenance-surface mutations (methods, channels, route rules, refunds,
    // reconciliation, and development triggers). The Payment backend remains
    // the authorization boundary; these gates only hide unavailable actions.
    canUpdatePaymentProvider: hasPortalPermission(
      'commerce.payments.providers.update',
      permissionScope,
    ),
    canCreatePaymentMethod: hasPortalPermission(
      'commerce.payments.methods.create',
      permissionScope,
    ),
    canUpdatePaymentMethod: hasPortalPermission(
      'commerce.payments.methods.update',
      permissionScope,
    ),
    canCreatePaymentChannel: hasPortalPermission(
      'commerce.payments.channels.create',
      permissionScope,
    ),
    canUpdatePaymentChannel: hasPortalPermission(
      'commerce.payments.channels.update',
      permissionScope,
    ),
    canDeletePaymentChannel: hasPortalPermission(
      'commerce.payments.channels.delete',
      permissionScope,
    ),
    canCreateRouteRule: hasPortalPermission(
      'commerce.payments.route_rules.create',
      permissionScope,
    ),
    canUpdateRouteRule: hasPortalPermission(
      'commerce.payments.route_rules.update',
      permissionScope,
    ),
    canDeleteRouteRule: hasPortalPermission(
      'commerce.payments.route_rules.delete',
      permissionScope,
    ),
    canCreateRefund: hasPortalPermission(
      'commerce.payments.refunds.create',
      permissionScope,
    ),
    canRetryRefund: hasPortalPermission(
      'commerce.payments.refunds.retry',
      permissionScope,
    ),
    canCreateReconciliationRun: hasPortalPermission(
      'commerce.payments.reconciliation_runs.create',
      permissionScope,
    ),
    canTriggerSandbox: hasPortalPermission(
      'commerce.payments.dev.sandbox_trigger',
      permissionScope,
    ),
    canTestWebhookSignature: hasPortalPermission(
      'commerce.payments.dev.webhook_signature_test',
      permissionScope,
    ),
  }), [permissionScope]);
}

function usePaymentMaintenanceCapabilities(): PaymentMaintenanceCapabilities {
  const [permissionScope, setPermissionScope] = useState(() => readPortalPermissionScope());

  useEffect(() => {
    const syncPermissionScope = () => setPermissionScope(readPortalPermissionScope());
    syncPermissionScope();
    return subscribePortalSessionChange(syncPermissionScope);
  }, []);

  return useMemo(() => ({
    canUpdatePaymentProvider: hasPortalPermission('commerce.payments.providers.update', permissionScope),
    canCreatePaymentMethod: hasPortalPermission('commerce.payments.methods.create', permissionScope),
    canUpdatePaymentMethod: hasPortalPermission('commerce.payments.methods.update', permissionScope),
    canCreatePaymentChannel: hasPortalPermission('commerce.payments.channels.create', permissionScope),
    canUpdatePaymentChannel: hasPortalPermission('commerce.payments.channels.update', permissionScope),
    canDeletePaymentChannel: hasPortalPermission('commerce.payments.channels.delete', permissionScope),
    canCreateRouteRule: hasPortalPermission('commerce.payments.route_rules.create', permissionScope),
    canUpdateRouteRule: hasPortalPermission('commerce.payments.route_rules.update', permissionScope),
    canDeleteRouteRule: hasPortalPermission('commerce.payments.route_rules.delete', permissionScope),
    canCreateRefund: hasPortalPermission('commerce.payments.refunds.create', permissionScope),
    canRetryRefund: hasPortalPermission('commerce.payments.refunds.retry', permissionScope),
    canCreateReconciliationRun: hasPortalPermission('commerce.payments.reconciliation_runs.create', permissionScope),
    canTriggerSandbox: hasPortalPermission('commerce.payments.dev.sandbox_trigger', permissionScope),
    canTestWebhookSignature: hasPortalPermission('commerce.payments.dev.webhook_signature_test', permissionScope),
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

function formatEnumCell(t: PaymentTranslate, keyPrefix: string): (value: unknown) => string {
  return (value) => formatPaymentEnumValue(t, keyPrefix, value);
}

/** CSV column order mirrors the payment record table (labels, then values). */
function paymentRecordCsvHeaders(t: PaymentTranslate): string[] {
  return [
    t('admin.commerce.payments.col.paymentIntentNo', 'Intent No'),
    t('admin.col.order', 'Order'),
    t('admin.commerce.payments.col.ownerUserId', 'Owner User'),
    t('admin.commerce.payments.col.paymentMethod', 'Payment Method'),
    t('admin.col.provider', 'Provider'),
    t('admin.col.amount', 'Amount'),
    t('admin.col.currency', 'Currency'),
    t('admin.col.status', 'Status'),
    t('admin.col.created', 'Created'),
    t('admin.col.updated', 'Updated'),
  ];
}

/** CSV column order mirrors the refund record table (labels, then values). */
function refundCsvHeaders(t: PaymentTranslate): string[] {
  return [
    t('admin.commerce.payments.col.refundNo', 'Refund No'),
    t('admin.col.order', 'Order'),
    t('admin.commerce.payments.col.paymentIntentId', 'Intent ID'),
    t('admin.commerce.payments.col.paymentAttemptId', 'Attempt ID'),
    t('admin.col.provider', 'Provider'),
    t('admin.col.amount', 'Amount'),
    t('admin.col.currency', 'Currency'),
    t('admin.col.status', 'Status'),
    t('admin.commerce.payments.col.reasonCode', 'Reason'),
    t('admin.commerce.payments.col.requestedByType', 'Requested By'),
    t('admin.commerce.payments.col.requestedBy', 'Requester'),
    t('admin.col.created', 'Created'),
    t('admin.col.updated', 'Updated'),
  ];
}

function exportResultMessage(
  t: PaymentTranslate,
  count: number,
  truncated: boolean,
): { kind: 'error' | 'success'; text: string } {
  return truncated
    ? {
      kind: 'error',
      text: t(
        'admin.commerce.payments.export.limit',
        'Export is capped at {{limit}} rows. Narrow the filters and export again.',
        { limit: PAYMENT_RECORD_EXPORT_LIMIT },
      ),
    }
    : {
      kind: 'success',
      text: t('admin.commerce.payments.export.success', 'Exported {{count}} records.', { count }),
    };
}

function formatEnumArrayCell(t: PaymentTranslate, keyPrefix: string): (value: unknown) => string {
  return (value) => {
    if (!Array.isArray(value)) {
      return formatPaymentEnumValue(t, keyPrefix, value);
    }
    return value.map((item) => formatPaymentEnumValue(t, keyPrefix, item)).join(', ');
  };
}

function sectionHelp(t: PaymentTranslate, prefix: string, stepCount: number, noteCount: number): AdminResourceHelpContent {
  return {
    title: t(`admin.commerce.payments.help.${prefix}.title`),
    description: t(`admin.commerce.payments.help.${prefix}.desc`),
    steps: Array.from({ length: stepCount }, (_, index) => t(`admin.commerce.payments.help.${prefix}.step${index + 1}`)),
    notes: Array.from({ length: noteCount }, (_, index) => t(`admin.commerce.payments.help.${prefix}.note${index + 1}`)),
  };
}

