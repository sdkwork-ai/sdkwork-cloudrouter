import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Wallet } from 'lucide-react';
import { AdminResourceCenter, type AdminResourceSection } from '@sdkwork/clawroutes-pc-commons';
import {
  backendRechargesOrdersList,
  backendWalletAccountsList,
  backendWalletExchangeRulesList,
  backendWalletLedgerEntriesList,
} from './walletService';

type WalletAdminTab = 'rechargeOrders' | 'walletAccounts' | 'walletLedger' | 'exchangeRules';
type WalletAdminGroup = string;

const DEFAULT_PAGE_PARAMS = { page: 1, pageSize: 100 };
const DEFAULT_WALLET_SECTION_ID: WalletAdminTab = 'walletAccounts';

type WalletAdminProps = {
  sectionId?: string;
};

function resolveWalletSectionId(sectionId?: string): WalletAdminTab {
  if (
    sectionId === 'rechargeOrders'
    || sectionId === 'walletAccounts'
    || sectionId === 'walletLedger'
    || sectionId === 'exchangeRules'
  ) {
    return sectionId;
  }
  return DEFAULT_WALLET_SECTION_ID;
}

function buildWalletSections(t: ReturnType<typeof useTranslation>['t']): AdminResourceSection<WalletAdminTab, WalletAdminGroup>[] {
  return [
    {
      id: 'rechargeOrders',
      title: t('admin.commerce.wallet.rechargeOrders.title', 'Recharge Orders'),
      description: t('admin.commerce.wallet.rechargeOrders.desc', 'Recharge order lifecycle bound to unified order and payment centers.'),
      icon: <CreditCard className="h-4 w-4" />,
      group: t('admin.commerce.wallet.group.recharge', 'Recharge') as WalletAdminGroup,
      load: () => backendRechargesOrdersList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'order_no', label: t('admin.col.order', 'Order') },
        { key: 'owner_user_id', label: t('admin.col.user', 'User') },
        { key: 'package_id', label: t('admin.col.package', 'Package') },
        { key: 'payment_status', label: t('admin.col.payment', 'Payment') },
        { key: 'status', label: t('admin.col.status', 'Status') },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      searchFields: ['order_no', 'owner_user_id', 'package_id', 'payment_status', 'status'],
    },
    {
      id: 'walletAccounts',
      title: t('admin.commerce.wallet.walletAccounts.title', 'Wallet Accounts'),
      description: t('admin.commerce.wallet.walletAccounts.desc', 'User and organization wallet account balances by currency or point ledger.'),
      icon: <Wallet className="h-4 w-4" />,
      group: t('admin.commerce.wallet.group.wallet', 'Wallet') as WalletAdminGroup,
      load: () => backendWalletAccountsList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'account_no', label: t('admin.col.account', 'Account') },
        { key: 'owner_user_id', label: t('admin.col.user', 'User') },
        { key: 'currency_code', label: t('admin.col.currency', 'Currency') },
        { key: 'available_balance', label: t('admin.col.available', 'Available'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['account_no', 'owner_user_id', 'currency_code', 'status'],
    },
    {
      id: 'walletLedger',
      title: t('admin.commerce.wallet.walletLedger.title', 'Wallet Ledger'),
      description: t('admin.commerce.wallet.walletLedger.desc', 'Immutable wallet ledger entries for recharge, purchase, refund, adjustment, and exchange.'),
      icon: <Wallet className="h-4 w-4" />,
      group: t('admin.commerce.wallet.group.wallet', 'Wallet') as WalletAdminGroup,
      load: () => backendWalletLedgerEntriesList(DEFAULT_PAGE_PARAMS),
      columns: [
        { key: 'entry_no', label: t('admin.col.entry', 'Entry') },
        { key: 'account_id', label: t('admin.col.account', 'Account') },
        { key: 'business_type', label: t('admin.col.business', 'Business') },
        { key: 'amount_delta', label: t('admin.col.delta', 'Delta'), align: 'right' },
        { key: 'created_at', label: t('admin.col.created', 'Created') },
      ],
      searchFields: ['entry_no', 'account_id', 'business_type', 'source_id'],
    },
    {
      id: 'exchangeRules',
      title: t('admin.commerce.wallet.exchangeRules.title', 'Exchange Rules'),
      description: t('admin.commerce.wallet.exchangeRules.desc', 'Wallet and point exchange rules for commercial balance conversion.'),
      icon: <Wallet className="h-4 w-4" />,
      group: t('admin.commerce.wallet.group.wallet', 'Wallet') as WalletAdminGroup,
      load: () => backendWalletExchangeRulesList(),
      columns: [
        { key: 'rule_no', label: t('admin.col.rule', 'Rule') },
        { key: 'source_currency', label: t('admin.col.source', 'Source') },
        { key: 'target_currency', label: t('admin.col.target', 'Target') },
        { key: 'exchange_rate', label: t('admin.col.rate', 'Rate'), align: 'right' },
        { key: 'status', label: t('admin.col.status', 'Status') },
      ],
      searchFields: ['rule_no', 'source_currency', 'target_currency', 'status'],
    },
  ];
}

export function WalletAdmin({ sectionId }: WalletAdminProps = {}) {
  const { t } = useTranslation();
  const sections = useMemo(() => buildWalletSections(t), [t]);
  const activeSectionId = resolveWalletSectionId(sectionId);

  return (
    <AdminResourceCenter
      activeSectionId={activeSectionId}
      emptyTitle={t('admin.commerce.wallet.empty', 'No wallet records')}
      errorTitle={t('admin.commerce.wallet.error', 'Wallet data could not be loaded')}
      loadingTitle={t('admin.commerce.wallet.loading', 'Loading wallet records...')}
      sections={sections}
      showSectionNavigation={false}
      tableViewportDataAttribute="admin-wallet-table-viewport"
    />
  );
}
