import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, QrCode, Sparkles, Ticket, Wallet } from 'lucide-react';
import { Button, Input, StatusNotice } from '@sdkwork/ui-pc-react';
import {
  SdkworkWalletBalancePanel,
  SdkworkWalletIntlProvider,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
  type SdkworkWalletTransaction,
} from '@sdkwork/account-pc-wallet';
import { SdkworkPointsRechargeInline } from '@sdkwork/order-pc-recharge';
import { getClawRouterPointsRechargeService } from '@sdkwork/clawroutes-pc-commons/domain-service-providers';
import {
  getSdkworkPromotionService,
  unwrapSdkworkPromotionResponse,
} from '@sdkwork/promotion-service';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';
import { ClawRouterWithdrawDialog } from './ClawRouterWithdrawDialog.tsx';
import { resolveConsoleWalletLocale } from './consoleCommerceLocale.ts';

type WalletTab = 'redeem' | 'recharge';

interface NoticeState {
  tone: 'success' | 'warning' | 'danger';
  message: string;
}

export function ClawRouterWalletPage() {
  const { i18n } = useTranslation();
  const walletLocale = resolveConsoleWalletLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <SdkworkWalletIntlProvider locale={walletLocale}>
      <ClawRouterWalletPageContent />
    </SdkworkWalletIntlProvider>
  );
}

function ClawRouterWalletPageContent() {
  const { t } = useTranslation();
  const controller = useSdkworkWalletController();
  const state = useSdkworkWalletControllerState(controller);
  const { copy } = useSdkworkWalletIntl();

  const [activeTab, setActiveTab] = useState<WalletTab>('redeem');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemNotice, setRedeemNotice] = useState<NoticeState | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const isAuthenticated = usePortalIamSession();
  const pointsRechargeService = useMemo(() => getClawRouterPointsRechargeService(), []);

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  async function handleRedeem() {
    const code = redeemCode.trim();
    if (!code) {
      return;
    }
    setRedeemNotice(null);
    try {
      unwrapSdkworkPromotionResponse(
        await getSdkworkPromotionService().promotions.codes.redemptions.create({
          code,
          channel: 'console-wallet',
        }),
        t('console.billing.errors.redeemFallback'),
      );
      setRedeemCode('');
      setRedeemNotice({ tone: 'success', message: t('console.billing.billingview.text.1gjg4cp') });
      await controller.refresh();
    } catch {
      setRedeemNotice({ tone: 'danger', message: t('console.billing.errors.redeemFallback') });
    }
  }

  function handleCopy(field: string, value: string) {
    if (!value) {
      return;
    }
    void navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    });
  }

  const unavailableLabel = t('console.billing.billingview.text.1om3err');

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full max-w-none">
        <div className="w-full max-w-none space-y-3">
          <SdkworkWalletBalancePanel
            onOpenRecharge={() => setActiveTab('recharge')}
            onOpenWithdraw={() => controller.openWithdraw()}
            overview={{ ...state.overview, isAuthenticated }}
          />

          {state.lastError ? (
            <StatusNotice tone="danger" title={t('console.recharge.records.loadFailed')}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{state.lastError}</span>
                <Button
                  disabled={state.isLoading}
                  loading={state.isLoading}
                  onClick={() => void controller.bootstrap().catch(() => undefined)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t('console.recharge.records.refresh')}
                </Button>
              </div>
            </StatusNotice>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              <section className="overflow-hidden rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)]">
                <div className="flex gap-1 border-b border-[var(--sdk-color-border-subtle)] p-1.5">
                  <TabButton
                    active={activeTab === 'redeem'}
                    icon="ticket"
                    label={t('console.recharge.tabs.redeem')}
                    onClick={() => setActiveTab('redeem')}
                  />
                  <TabButton
                    active={activeTab === 'recharge'}
                    icon="wallet"
                    label={t('console.recharge.tabs.online')}
                    onClick={() => setActiveTab('recharge')}
                  />
                </div>

                <div className="space-y-3 p-4 sm:p-4">
                  {state.isLoading && !state.isBootstrapped ? (
                    <div className="space-y-3">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--sdk-color-surface-panel-muted)]" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="h-24 animate-pulse rounded-[var(--sdk-radius-field)] bg-[var(--sdk-color-surface-panel-muted)]" />
                        <div className="h-24 animate-pulse rounded-[var(--sdk-radius-field)] bg-[var(--sdk-color-surface-panel-muted)]" />
                      </div>
                      <div className="h-10 animate-pulse rounded bg-[var(--sdk-color-surface-panel-muted)]" />
                      <div className="h-16 animate-pulse rounded-[var(--sdk-radius-field)] bg-[var(--sdk-color-surface-panel-muted)]" />
                    </div>
                  ) : !isAuthenticated ? (
                    <StatusNotice
                      title={copy.rechargeDialog.signInRequiredTitle}
                      tone="warning"
                    >
                      {copy.rechargeDialog.signInRequiredDescription}
                    </StatusNotice>
                  ) : activeTab === 'redeem' ? (
                    <RedeemPanel
                      redeemCode={redeemCode}
                      redeemNotice={redeemNotice}
                      onRedeemCodeChange={(value) => {
                        setRedeemCode(value);
                        setRedeemNotice(null);
                      }}
                      onSubmit={handleRedeem}
                    />
                  ) : (
                    <SdkworkPointsRechargeInline
                      copy={{
                        account: t('points_recharge.account', 'Claw Router'),
                        agreement: t('points_recharge.agreement', '支付前请阅读并同意《算力元充值服务协议》。'),
                        agreementAccepted: t('points_recharge.agreement_accepted', '您已同意《算力元充值服务协议》。'),
                        agreementRequired: t('points_recharge.agreement_required', '请先同意算力元充值服务协议'),
                        close: t('close', '关闭'),
                        completed: t('points_recharge.completed', '支付完成，算力元已到账'),
                        confirmPayment: t('points_recharge.confirm_payment', '同意并支付'),
                        creatingPayment: t('points_recharge.creating_payment', '正在生成支付二维码...'),
                        emptyPackages: t('points_recharge.empty_packages', '暂无可用充值套餐'),
                        loadFailed: t('points_recharge.load_failed', '充值套餐加载失败'),
                        loadingPackages: t('points_recharge.loading_packages', '正在加载充值套餐...'),
                        myPoints: t('points_recharge.my_points', '我的算力元'),
                        notice: t('points_recharge.notice', '温馨提示：算力元不可兑换会员、不可转赠，也不可提现；充值后有效期以平台规则为准。'),
                        paymentUnavailable: t('points_recharge.payment_unavailable', '支付暂不可用'),
                        paymentUnavailableDescription: t('points_recharge.payment_unavailable_description', '暂时无法生成支付二维码，请稍后重试。'),
                        pointsUnit: t('points_recharge.points_unit', '算力元'),
                        retry: t('points_recharge.retry', '重新加载'),
                        scanPrompt: t('points_recharge.scan_prompt', '请扫码完成支付'),
                        title: t('points_recharge.title', '算力元购买'),
                      }}
                      currentPoints={state.overview.account.availablePoints}
                      onCompleted={async () => {
                        await controller.refresh();
                      }}
                      service={pointsRechargeService}
                    />
                  )}
                </div>
              </section>

              <RecentRecords transactions={state.overview.transactions} />
            </div>

            <aside className="space-y-3">
              <ShareMarketingPanel
                copiedField={copiedField}
                unavailableLabel={unavailableLabel}
                onCopy={handleCopy}
              />
            </aside>
          </div>
        </div>
      </div>

      <ClawRouterWithdrawDialog
        controller={controller}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeWithdraw();
          }
        }}
        open={state.isWithdrawOpen}
      />
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  icon: 'ticket' | 'wallet';
  label: string;
  onClick: () => void;
}

function TabButton({ active, icon, label, onClick }: TabButtonProps) {
  const Icon = icon === 'ticket' ? Ticket : Wallet;
  return (
    <button
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--sdk-radius-pill)] px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
        active
          ? 'bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]'
          : 'text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]'
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

interface RedeemPanelProps {
  redeemCode: string;
  redeemNotice: NoticeState | null;
  onRedeemCodeChange: (value: string) => void;
  onSubmit: () => void;
}

function RedeemPanel({
  redeemCode,
  redeemNotice,
  onRedeemCodeChange,
  onSubmit,
}: RedeemPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-[var(--sdk-radius-field)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sdk-color-brand-primary-soft)]">
          <Ticket className="h-5 w-5 text-[var(--sdk-color-brand-primary)]" aria-hidden="true" />
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--sdk-color-text-secondary)]">
          {t('console.billing.billingview.text.1p5a2ge')}
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
          htmlFor="claw-router-wallet-redeem-code"
        >
          {t('console.billing.billingview.text.17khw81')}
        </label>
        <div className="flex gap-2">
          <Input
            className="h-10 flex-1"
            id="claw-router-wallet-redeem-code"
            onChange={(event: ChangeEvent<HTMLInputElement>) => onRedeemCodeChange(event.target.value)}
            placeholder={t('console.billing.billingview.text.zreqwb')}
            value={redeemCode}
          />
          <Button
            className="h-10 shrink-0"
            disabled={!redeemCode.trim()}
            onClick={onSubmit}
            type="button"
          >
            {t('console.billing.billingview.text.cl1a9g')}
          </Button>
        </div>
      </div>

      {redeemNotice ? (
        <StatusNotice tone={redeemNotice.tone}>{redeemNotice.message}</StatusNotice>
      ) : null}
    </div>
  );
}

const RECENT_RECORD_LIMIT = 8;
type RecordsTab = 'all' | 'redeem' | 'recharge';

interface RecentRecordsProps {
  transactions: SdkworkWalletTransaction[];
}

function matchesRecordTab(transaction: SdkworkWalletTransaction, tab: RecordsTab): boolean {
  if (tab === 'all') {
    return true;
  }
  const haystack = `${transaction.transactionType ?? ''} ${transaction.transactionTypeName ?? ''} ${transaction.title ?? ''}`.toLowerCase();
  if (tab === 'recharge') {
    return /recharge|top.?up|充值/.test(haystack);
  }
  return /redeem|exchange|兑换/.test(haystack);
}

function RecentRecords({ transactions }: RecentRecordsProps) {
  const { t } = useTranslation();
  const { formatCurrencyCny, formatTransactionTimestamp, formatWalletDelta } = useSdkworkWalletIntl();
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('all');

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => matchesRecordTab(tx, recordsTab))
      .slice(0, RECENT_RECORD_LIMIT);
  }, [transactions, recordsTab]);

  const tabs: { key: RecordsTab; label: string }[] = [
    { key: 'all', label: t('console.recharge.records.tabs.all') },
    { key: 'redeem', label: t('console.recharge.records.tabs.redeem') },
    { key: 'recharge', label: t('console.recharge.records.tabs.recharge') },
  ];

  return (
    <section className="rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--sdk-color-border-subtle)] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
          {t('console.wallet.recent.title')}
        </h2>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              className={`rounded-[var(--sdk-radius-pill)] px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
                recordsTab === tab.key
                  ? 'bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]'
                  : 'text-[var(--sdk-color-text-muted)] hover:bg-[var(--sdk-color-surface-panel-muted)]'
              }`}
              key={tab.key}
              onClick={() => setRecordsTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-[var(--sdk-color-text-muted)] sm:px-5">
          {t('console.recharge.records.emptyHint')}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--sdk-color-border-subtle)]">
          {filtered.map((tx) => {
            const isPositive = tx.pointsDelta > 0;
            const typeLabel = tx.transactionTypeName || tx.transactionType;

            return (
              <li className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--sdk-color-surface-panel-muted)] sm:px-5" key={tx.id}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                      {tx.title}
                    </span>
                    {typeLabel ? (
                      <span className="shrink-0 rounded-full bg-[var(--sdk-color-surface-panel-muted)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--sdk-color-text-muted)]">
                        {typeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--sdk-color-text-muted)]">
                    {formatTransactionTimestamp(tx.createdAt)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-[var(--sdk-color-state-success)]' : 'text-[var(--sdk-color-text-primary)]'}`}>
                    {formatWalletDelta(tx.pointsDelta)}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--sdk-color-text-muted)]">
                    {formatCurrencyCny(tx.cashAmountCny)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface ShareMarketingPanelProps {
  copiedField: string | null;
  unavailableLabel: string;
  onCopy: (field: string, value: string) => void;
}

function ShareMarketingPanel({
  copiedField,
  unavailableLabel,
  onCopy,
}: ShareMarketingPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)]">
      <div className="bg-[var(--sdk-color-brand-primary-soft)] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sdk-color-brand-primary)] text-[var(--sdk-color-text-inverse)]">
            <Gift className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
              {t('console.billing.billingview.text.1qywqye')}
            </h2>
            <p className="mt-0.5 text-[0.7rem] text-[var(--sdk-color-text-secondary)]">
              {t('console.billing.billingview.text.ulf9ee')}
              {t('console.billing.billingview.text.6eqybf')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--sdk-color-text-muted)]">
            {t('console.billing.billingview.text.1qp7wtk')}
          </label>
          <div className="flex gap-2">
            <Input
              className="h-9 flex-1 text-xs"
              readOnly
              value={unavailableLabel}
            />
            <Button
              className="h-9 shrink-0 text-xs"
              disabled
              onClick={() => onCopy('link', unavailableLabel)}
              type="button"
              variant="ghost"
            >
              {copiedField === 'link' ? t('console.wallet.share.copied') : t('console.wallet.share.copy')}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--sdk-color-text-muted)]">
            {t('console.wallet.share.qrcode')}
          </label>
          <div className="flex aspect-square w-full items-center justify-center rounded-[var(--sdk-radius-field)] border border-dashed border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]">
            <div className="flex flex-col items-center gap-1.5 text-[var(--sdk-color-text-muted)]">
              <QrCode className="h-8 w-8" aria-hidden="true" />
              <span className="text-[0.7rem]">{t('console.billing.billingview.text.1ch47qi')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-1.5 border-t border-[var(--sdk-color-border-subtle)] pt-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sdk-color-brand-primary)]" aria-hidden="true" />
          <p className="text-[0.7rem] leading-relaxed text-[var(--sdk-color-text-muted)]">
            {t('console.billing.billingview.text.1om3err')}
          </p>
        </div>
      </div>
    </section>
  );
}
