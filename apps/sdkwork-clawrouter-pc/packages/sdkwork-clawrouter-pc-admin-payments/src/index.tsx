import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, CreditCard, Receipt, ShieldCheck } from 'lucide-react';
import {
  AdminResourceCenter,
  type AdminResourceLoadParams,
  type AdminResourceSection,
} from '@sdkwork/clawroutes-pc-commons';
import {
  hasPortalPermission,
  readPortalPermissionScope,
  subscribePortalSessionChange,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  PaymentProviderAdminWorkspace,
  createPaymentProviderAdminController,
  type PaymentProviderAdminCapabilities,
} from '@sdkwork/payment-pc-admin-provider';
import { getSdkworkPaymentBackendService } from '@sdkwork/payment-service';
import {
  backendPaymentsAttemptsList,
  backendPaymentsChannelsList,
  backendPaymentsIntentsList,
  backendPaymentsMethodsList,
  backendPaymentsProvidersList,
  backendPaymentsReconciliationRunsList,
  backendPaymentsRouteRulesList,
  backendPaymentsWebhookEventsList,
} from './paymentsService';

type PaymentsAdminTab =
  | 'providers'
  | 'providerAccounts'
  | 'methods'
  | 'channels'
  | 'routeRules'
  | 'intents'
  | 'attempts'
  | 'webhookEvents'
  | 'reconciliationRuns';

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
    () => createPaymentProviderAdminController({ service: getSdkworkPaymentBackendService() }),
    [],
  );

  return (
    <div className="h-full min-h-0 w-full overflow-auto" data-admin-payments-provider-workspace>
      <PaymentProviderAdminWorkspace
        capabilities={capabilities}
        controller={controller}
        description={t(
          'admin.commerce.payments.providerAccounts.desc',
          'Manage write-only provider credentials, readiness checks, rotation, and partner sub-merchants.',
        )}
        title={t('admin.commerce.payments.providerAccounts.title', 'Provider Accounts')}
      />
    </div>
  );
}

function PaymentResourceAdmin({ activeSectionId }: { activeSectionId: PaymentResourceTab }) {
  const { t } = useTranslation();
  const paymentSections = useMemo<AdminResourceSection<PaymentResourceTab, PaymentsAdminGroup>[]>(() => [
    createPaymentListSection({
      id: 'providers',
      title: t('admin.commerce.payments.providers.title', 'Payment Providers'),
      description: t(
        'admin.commerce.payments.providers.desc',
        'Claw Router provider inventory and product-specific availability metadata.',
      ),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsProvidersList,
      columns: [
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'providerType', label: t('admin.col.type', 'Type') },
        { key: 'supportedCountries', label: t('admin.col.countries', 'Countries') },
        { key: 'supportedCurrencies', label: t('admin.col.currencies', 'Currencies') },
        { key: 'capabilities', label: t('admin.col.capabilities', 'Capabilities') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['providerCode', 'displayName', 'providerType', 'supportedCountries', 'supportedCurrencies', 'capabilities', 'status'],
    }),
    createPaymentListSection({
      id: 'methods',
      title: t('admin.commerce.payments.methods.title', 'Payment Methods'),
      description: t('admin.commerce.payments.methods.desc', 'Payment methods exposed to checkout, memberships, recharge, and wallet flows.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsMethodsList,
      columns: [
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'displayName', label: t('admin.col.name', 'Name') },
        { key: 'methodType', label: t('admin.col.type', 'Type') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'checkoutScenes', label: t('admin.col.scenes', 'Scenes') },
        { key: 'sortOrder', label: t('admin.col.sort', 'Sort'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['methodCode', 'displayName', 'methodType', 'providerCode', 'checkoutScenes', 'status'],
    }),
    createPaymentListSection({
      id: 'channels',
      title: t('admin.commerce.payments.channels.title', 'Payment Channels'),
      description: t('admin.commerce.payments.channels.desc', 'Country, currency, scene, and provider-account routing channels.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsChannelsList,
      columns: [
        { key: 'channelNo', label: t('admin.col.channel', 'Channel') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'providerAccountId', label: t('admin.col.account', 'Account') },
        { key: 'sceneCode', label: t('admin.col.scene', 'Scene') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['channelNo', 'methodCode', 'providerAccountId', 'countryCode', 'currencyCode', 'sceneCode', 'status'],
    }),
    createPaymentListSection({
      id: 'routeRules',
      title: t('admin.commerce.payments.routeRules.title', 'Route Rules'),
      description: t('admin.commerce.payments.routeRules.desc', 'Payment route rules by market, method, currency, priority, and fallback.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.providerSetup', 'Provider Setup'),
      load: backendPaymentsRouteRulesList,
      columns: [
        { key: 'ruleNo', label: t('admin.col.rule', 'Rule') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'sceneCode', label: t('admin.col.scene', 'Scene') },
        { key: 'countryCode', label: t('admin.col.country', 'Country') },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'channelId', label: t('admin.col.channel', 'Channel') },
        { key: 'fallbackEnabled', label: t('admin.col.fallback', 'Fallback') },
        { key: 'priority', label: t('admin.col.priority', 'Priority'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['ruleNo', 'methodCode', 'currencyCode', 'countryCode', 'sceneCode', 'status'],
    }),
    createPaymentListSection({
      id: 'intents',
      title: t('admin.commerce.payments.intents.title', 'Payment Intents'),
      description: t('admin.commerce.payments.intents.desc', 'Unified payment intents created from orders, memberships, recharge, and wallet flows.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: backendPaymentsIntentsList,
      columns: [
        { key: 'intentNo', label: t('admin.col.intent', 'Intent') },
        { key: 'orderId', label: t('admin.col.order', 'Order') },
        { key: 'subjectType', label: t('admin.col.type', 'Type') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['intentNo', 'orderId', 'subjectType', 'methodCode', 'providerCode', 'currencyCode', 'status'],
    }),
    createPaymentListSection({
      id: 'attempts',
      title: t('admin.commerce.payments.attempts.title', 'Payment Attempts'),
      description: t('admin.commerce.payments.attempts.desc', 'Provider request attempts, external trade numbers, and payment result lifecycle.'),
      icon: <Receipt className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.paymentRuntime', 'Payment Runtime'),
      load: backendPaymentsAttemptsList,
      columns: [
        { key: 'attemptNo', label: t('admin.col.attempt', 'Attempt') },
        { key: 'intentId', label: t('admin.col.intent', 'Intent') },
        { key: 'methodCode', label: t('admin.col.method', 'Method') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'externalTradeNo', label: t('admin.col.externalTrade', 'External Trade') },
        { key: 'amount', label: t('admin.col.amount', 'Amount'), align: 'right' },
        { key: 'currencyCode', label: t('admin.col.currency', 'Currency') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'paidAt', label: t('admin.col.paid', 'Paid') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'updatedAt', label: t('admin.col.updated', 'Updated') },
      ],
      searchFields: ['attemptNo', 'intentId', 'providerCode', 'methodCode', 'externalTradeNo', 'currencyCode', 'status'],
    }),
    createPaymentListSection({
      id: 'webhookEvents',
      title: t('admin.commerce.payments.webhookEvents.title', 'Webhook Events'),
      description: t('admin.commerce.payments.webhookEvents.desc', 'Inbound payment webhook events and idempotent processing state.'),
      icon: <ShieldCheck className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: backendPaymentsWebhookEventsList,
      columns: [
        { key: 'eventNo', label: t('admin.col.event', 'Event') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'eventType', label: t('admin.col.type', 'Type') },
        { key: 'externalEventId', label: t('admin.col.externalEvent', 'External Event') },
        { key: 'processStatus', label: t('admin.col.process', 'Process') },
        { key: 'receivedAt', label: t('admin.col.received', 'Received') },
        { key: 'processedAt', label: t('admin.col.processed', 'Processed') },
      ],
      searchFields: ['eventNo', 'providerCode', 'eventType', 'processStatus', 'externalEventId'],
    }),
    createPaymentListSection({
      id: 'reconciliationRuns',
      title: t('admin.commerce.payments.reconciliationRuns.title', 'Reconciliation Runs'),
      description: t('admin.commerce.payments.reconciliationRuns.desc', 'Payment reconciliation batches, statement imports, and discrepancy tracking.'),
      icon: <BarChart3 className="h-4 w-4" />,
      group: t('admin.commerce.payments.group.riskReconciliation', 'Risk & Reconciliation'),
      load: backendPaymentsReconciliationRunsList,
      columns: [
        { key: 'runNo', label: t('admin.col.run', 'Run') },
        { key: 'providerCode', label: t('admin.col.provider', 'Provider') },
        { key: 'businessDate', label: t('admin.col.businessDate', 'Business Date') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'createdAt', label: t('admin.col.created', 'Created') },
        { key: 'finishedAt', label: t('admin.col.finished', 'Finished') },
      ],
      searchFields: ['runNo', 'providerCode', 'businessDate', 'status', 'createdAt'],
    }),
  ], [t]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden" data-admin-payments-layout>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdminResourceCenter
          activeSectionId={activeSectionId}
          emptyTitle={t('admin.commerce.payments.empty', 'No payment records')}
          errorTitle={t('admin.commerce.payments.error', 'Payment data could not be loaded')}
          initialSectionId={DEFAULT_PAYMENT_RESOURCE_SECTION_ID}
          key={activeSectionId}
          loadingTitle={t('admin.commerce.payments.loading', 'Loading payment records...')}
          sections={paymentSections}
          showSectionNavigation={false}
          tableViewportDataAttribute="admin-payments-table-viewport"
        />
      </div>
    </div>
  );
}

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
