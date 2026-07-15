import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Gift, QrCode, Sparkles, Ticket, Wallet } from 'lucide-react';
import { Button, Input, StatusNotice } from '@sdkwork/ui-pc-react';
import {
  SdkworkWalletBalancePanel,
  SdkworkWalletIntlProvider,
  useSdkworkWalletController,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
  type SdkworkWalletRechargePackage,
  type SdkworkWalletTransaction,
} from '@sdkwork/account-pc-wallet';
import {
  getSdkworkPromotionService,
  unwrapSdkworkPromotionResponse,
} from '@sdkwork/promotion-service';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';
import { ClawRouterWithdrawDialog } from './ClawRouterWithdrawDialog.tsx';
import { resolveConsoleWalletLocale } from './consoleCommerceLocale.ts';

const PAYMENT_METHODS = ['WECHAT', 'ALIPAY', 'BANKCARD'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
type WalletTab = 'redeem' | 'recharge';

// 支付方式品牌色映射：选中时以品牌色高亮，提升识别度
const PAYMENT_METHOD_ACCENT: Record<PaymentMethod, { active: string; idle: string }> = {
  WECHAT: {
    active: 'border-[var(--sdk-color-state-success)] bg-[var(--sdk-color-state-success)]/10 text-[var(--sdk-color-state-success)]',
    idle: 'text-[var(--sdk-color-text-secondary)]',
  },
  ALIPAY: {
    active: 'border-[#1677ff] bg-[#1677ff]/10 text-[#1677ff]',
    idle: 'text-[var(--sdk-color-text-secondary)]',
  },
  BANKCARD: {
    active: 'border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]',
    idle: 'text-[var(--sdk-color-text-secondary)]',
  },
};

const CUSTOM_POINTS_MAX_LENGTH = 7;

function sanitizePointsInput(value: string): string {
  return value.replaceAll(/\D+/g, '').slice(0, CUSTOM_POINTS_MAX_LENGTH);
}

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
  const { copy, formatCurrencyCny, formatPaymentMethod, formatPoints, formatPointsRate } = useSdkworkWalletIntl();

  const [activeTab, setActiveTab] = useState<WalletTab>('redeem');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemNotice, setRedeemNotice] = useState<NoticeState | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [customPoints, setCustomPoints] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WECHAT');
  const [rechargeNotice, setRechargeNotice] = useState<NoticeState | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const isAuthenticated = usePortalIamSession();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  const rechargePackages = state.overview.rechargePackages;
  const pointsToCashRate = state.overview.pointsToCashRate;

  // 默认选中推荐套餐（若无推荐则选首个）
  useEffect(() => {
    if (selectedPackageId === null && customPoints === '' && rechargePackages.length > 0) {
      const featured = rechargePackages.find((pkg) => pkg.recommended) ?? rechargePackages[0];
      if (featured) {
        setSelectedPackageId(featured.id);
      }
    }
  }, [selectedPackageId, customPoints, rechargePackages]);

  const selectedPackage = useMemo(
    () => rechargePackages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [rechargePackages, selectedPackageId],
  );

  const effectivePoints = useMemo(() => {
    if (customPoints) {
      return Number.parseInt(customPoints, 10) || 0;
    }
    return selectedPackage?.points ?? 0;
  }, [customPoints, selectedPackage]);

  const payableAmountCny = useMemo(() => {
    if (!pointsToCashRate || effectivePoints <= 0) {
      return null;
    }
    return Number((effectivePoints / pointsToCashRate).toFixed(2));
  }, [effectivePoints, pointsToCashRate]);

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

  async function handleRecharge() {
    if (effectivePoints <= 0 || !isAuthenticated) {
      return;
    }
    setRechargeNotice(null);
    try {
      const result = await controller.rechargePoints({
        paymentMethod,
        points: effectivePoints,
      });
      if (result.status === 'failed') {
        setRechargeNotice({ tone: 'danger', message: t('console.recharge.errors.submitFallback') });
      } else if (result.status === 'pending') {
        setRechargeNotice({ tone: 'warning', message: t('console.recharge.records.status.pending') });
      } else {
        setRechargeNotice({ tone: 'success', message: t('console.billing.billingview.text.1gjg4cp') });
      }
    } catch {
      setRechargeNotice({ tone: 'danger', message: t('console.recharge.errors.submitFallback') });
    }
  }

  function handleSelectPackage(id: number) {
    setSelectedPackageId(id);
    setCustomPoints('');
  }

  function handleCustomPointsChange(value: string) {
    setCustomPoints(sanitizePointsInput(value));
    setSelectedPackageId(null);
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
      <div className="px-4 pb-3 sm:px-5 sm:pb-4">
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
                    <RechargePanel
                      packages={rechargePackages}
                      selectedPackageId={selectedPackageId}
                      customPoints={customPoints}
                      paymentMethod={paymentMethod}
                      rechargeNotice={rechargeNotice}
                      isMutating={state.isMutating}
                      effectivePoints={effectivePoints}
                      payableAmountCny={payableAmountCny}
                      pointsToCashRate={pointsToCashRate}
                      formatCurrencyCny={formatCurrencyCny}
                      formatPaymentMethod={formatPaymentMethod}
                      formatPoints={formatPoints}
                      formatPointsRate={formatPointsRate}
                      packageGridLabel={copy.rechargeDialog.packageGridLabel}
                      customAmountLabel={copy.rechargeDialog.customAmountLabel}
                      customAmountPlaceholder={copy.rechargeDialog.customAmountPlaceholder}
                      recommendedBadge={copy.rechargeDialog.recommendedBadge}
                      paymentMethodLabel={copy.rechargeDialog.paymentMethodLabel}
                      rateLabel={copy.rechargeDialog.rateLabel}
                      estimatedPriceLabel={copy.rechargeDialog.estimatedPriceLabel}
                      onSelectPackage={handleSelectPackage}
                      onCustomPointsChange={handleCustomPointsChange}
                      onSelectPaymentMethod={setPaymentMethod}
                      onSubmit={handleRecharge}
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

interface RechargePanelProps {
  packages: SdkworkWalletRechargePackage[];
  selectedPackageId: number | null;
  customPoints: string;
  paymentMethod: PaymentMethod;
  rechargeNotice: NoticeState | null;
  isMutating: boolean;
  effectivePoints: number;
  payableAmountCny: number | null;
  pointsToCashRate: number | null;
  formatCurrencyCny: (value: number | null) => string;
  formatPaymentMethod: (method: string) => string;
  formatPoints: (value: number) => string;
  formatPointsRate: (value: number | null) => string;
  packageGridLabel: string;
  customAmountLabel: string;
  customAmountPlaceholder: string;
  recommendedBadge: string;
  paymentMethodLabel: string;
  rateLabel: string;
  estimatedPriceLabel: string;
  onSelectPackage: (id: number) => void;
  onCustomPointsChange: (value: string) => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onSubmit: () => void;
}

function RechargePanel({
  packages,
  selectedPackageId,
  customPoints,
  paymentMethod,
  rechargeNotice,
  isMutating,
  effectivePoints,
  payableAmountCny,
  pointsToCashRate,
  formatCurrencyCny,
  formatPaymentMethod,
  formatPoints,
  formatPointsRate,
  packageGridLabel,
  customAmountLabel,
  customAmountPlaceholder,
  recommendedBadge,
  paymentMethodLabel,
  rateLabel,
  estimatedPriceLabel,
  onSelectPackage,
  onCustomPointsChange,
  onSelectPaymentMethod,
  onSubmit,
}: RechargePanelProps) {
  const { t } = useTranslation();
  const canSubmit = effectivePoints > 0 && !isMutating;

  return (
    <div className="space-y-4">
      {packages.length === 0 ? (
        <StatusNotice tone="info">{t('console.wallet.recharge.empty')}</StatusNotice>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
            {packageGridLabel}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {packages.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              const unitPrice = pkg.points > 0 ? pkg.priceCny / pkg.points : 0;

              return (
                <button
                  className={`relative rounded-[var(--sdk-radius-field)] border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
                    isSelected
                      ? 'border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)]'
                      : 'border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] hover:bg-[var(--sdk-color-surface-panel-muted)]'
                  }`}
                  key={pkg.id}
                  onClick={() => onSelectPackage(pkg.id)}
                  type="button"
                >
                  {isSelected ? (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sdk-color-brand-primary)] text-[var(--sdk-color-text-inverse)]">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 pr-6">
                      <span className="truncate text-sm font-medium text-[var(--sdk-color-text-primary)]">
                        {pkg.title}
                      </span>
                      {pkg.recommended ? (
                        <span className="shrink-0 rounded-full bg-[var(--sdk-color-brand-primary-soft)] px-1.5 py-0.5 text-[0.6rem] font-medium text-[var(--sdk-color-brand-primary)]">
                          {recommendedBadge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-lg font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                          {formatPoints(pkg.points)}
                        </div>
                        <div className="text-[0.65rem] text-[var(--sdk-color-text-muted)]">
                          {t('console.recharge.amountTitle')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums text-[var(--sdk-color-brand-primary)]">
                          {formatCurrencyCny(pkg.priceCny)}
                        </div>
                        {unitPrice > 0 ? (
                          <div className="text-[0.65rem] tabular-nums text-[var(--sdk-color-text-muted)]">
                            {formatCurrencyCny(unitPrice)}/{t('console.recharge.amountTitle')}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
          htmlFor="claw-router-wallet-custom-points"
        >
          {customAmountLabel}
        </label>
        <div className="relative">
          <Input
            className="h-10 pr-12"
            id="claw-router-wallet-custom-points"
            inputMode="numeric"
            onChange={(event: ChangeEvent<HTMLInputElement>) => onCustomPointsChange(event.target.value)}
            placeholder={customAmountPlaceholder}
            value={customPoints}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--sdk-color-text-muted)]">
            {t('console.recharge.amountTitle')}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
          {paymentMethodLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = paymentMethod === method;
            const accent = PAYMENT_METHOD_ACCENT[method];

            return (
              <button
                className={`rounded-[var(--sdk-radius-pill)] border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
                  isSelected
                    ? accent.active
                    : `border-[var(--sdk-color-border-default)] ${accent.idle} hover:bg-[var(--sdk-color-surface-panel-muted)]`
                }`}
                key={method}
                onClick={() => onSelectPaymentMethod(method)}
                type="button"
              >
                {formatPaymentMethod(method)}
              </button>
            );
          })}
        </div>
      </div>

      {rechargeNotice ? (
        <StatusNotice tone={rechargeNotice.tone}>{rechargeNotice.message}</StatusNotice>
      ) : null}

      <div className="overflow-hidden rounded-[var(--sdk-radius-field)] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                {formatPoints(effectivePoints)}
              </span>
              <span className="text-xs text-[var(--sdk-color-text-muted)]">
                {t('console.recharge.amountTitle')}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--sdk-color-text-muted)]">
              <span>{estimatedPriceLabel}</span>
              <span className="text-sm font-semibold tabular-nums text-[var(--sdk-color-brand-primary)]">
                {formatCurrencyCny(payableAmountCny)}
              </span>
              <span className="text-[var(--sdk-color-border-strong)]">·</span>
              <span>{rateLabel}</span>
              <span className="tabular-nums">{formatPointsRate(pointsToCashRate)}</span>
            </div>
          </div>
          <Button
            className="h-11 px-6 text-sm"
            disabled={!canSubmit}
            loading={isMutating}
            onClick={onSubmit}
            type="button"
          >
            {isMutating ? t('console.recharge.submittingPayment') : t('console.recharge.pay')}
          </Button>
        </div>
      </div>
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
