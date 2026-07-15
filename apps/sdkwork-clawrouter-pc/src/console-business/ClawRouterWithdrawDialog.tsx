import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  StatusNotice,
} from '@sdkwork/ui-pc-react';
import {
  createDefaultSdkworkWalletWithdrawDestinations,
  useSdkworkWalletControllerState,
  useSdkworkWalletIntl,
  type SdkworkWalletController,
  type SdkworkWalletWithdrawDestinationCode,
} from '@sdkwork/account-pc-wallet';

import { usePortalIamSession } from '../auth/usePortalIamSession.ts';

export interface ClawRouterWithdrawDialogProps {
  controller: SdkworkWalletController;
  onOpenChange?: (open: boolean) => void;
  open: boolean;
}

// 提现方式品牌色映射：选中时以品牌色高亮图标，提升识别度
const DESTINATION_META: Record<
  SdkworkWalletWithdrawDestinationCode,
  { icon: typeof Landmark; activeIcon: string; idleIcon: string }
> = {
  bank_account: {
    icon: Landmark,
    activeIcon: 'bg-[var(--sdk-color-brand-primary)] text-[var(--sdk-color-text-inverse)]',
    idleIcon: 'bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]',
  },
  ALIPAY: {
    icon: CreditCard,
    activeIcon: 'bg-[#1677ff] text-white',
    idleIcon: 'bg-[#1677ff]/10 text-[#1677ff]',
  },
  WECHAT_PAY: {
    icon: Smartphone,
    activeIcon: 'bg-[#07c160] text-white',
    idleIcon: 'bg-[#07c160]/10 text-[#07c160]',
  },
};

// 快捷提现比例：基于可提现余额动态计算，始终落在合法区间
const QUICK_RATIOS = [0.25, 0.5, 0.75, 1] as const;

function sanitizeAmount(value: string): string {
  const normalized = value.replaceAll(/[^\d.]/g, '');
  const [integerPartRaw, ...fractionParts] = normalized.split('.');
  const integerPart = integerPartRaw ?? '';
  const fractionPart = fractionParts.join('').slice(0, 2);
  return fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
}

export function ClawRouterWithdrawDialog({ controller, onOpenChange, open }: ClawRouterWithdrawDialogProps) {
  const { t } = useTranslation();
  const state = useSdkworkWalletControllerState(controller);
  const isAuthenticated = usePortalIamSession();
  const destinations = useMemo(() => createDefaultSdkworkWalletWithdrawDestinations(), []);
  const {
    copy,
    formatCurrencyCny,
    formatProjectedBalance,
    formatWithdrawDestinationDescription,
    formatWithdrawDestinationLabel,
    formatWithdrawRemarks,
  } = useSdkworkWalletIntl();

  const [amountInput, setAmountInput] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [requestNo, setRequestNo] = useState('');
  const [selectedDestinationCode, setSelectedDestinationCode] = useState<string>(destinations[0]?.code ?? '');

  const amountCny = Number.parseFloat(amountInput || '0');
  const trimmedAccountName = accountName.trim();
  const trimmedAccountNo = accountNo.trim();
  const trimmedBankName = bankName.trim();
  const trimmedRequestNo = requestNo.trim();
  const requestNoValid = !trimmedRequestNo || /^[A-Za-z0-9_-]{6,64}$/.test(trimmedRequestNo);
  const requiresBankName = selectedDestinationCode === 'bank_account';
  const cashAvailable = state.overview.account.cashAvailable;
  const amountExceedsAvailable = Number.isFinite(amountCny) && amountCny > cashAvailable;
  const projectedBalance = Number.isFinite(amountCny)
    ? Math.max(0, Number((cashAvailable - amountCny).toFixed(2)))
    : cashAvailable;

  // 弹窗打开时重置表单，关闭后不留残余态
  useEffect(() => {
    if (!open) {
      return;
    }
    setAmountInput('');
    setAccountName('');
    setAccountNo('');
    setBankName('');
    setRequestNo('');
    setSelectedDestinationCode(destinations[0]?.code ?? '');
  }, [destinations, open]);

  const selectedDestination = destinations.find((destination) => destination.code === selectedDestinationCode) ?? null;

  const canSubmit = useMemo(
    () =>
      isAuthenticated
      && Number.isFinite(amountCny)
      && amountCny > 0
      && amountCny <= cashAvailable
      && Boolean(trimmedAccountName)
      && Boolean(trimmedAccountNo)
      && (!requiresBankName || Boolean(trimmedBankName))
      && Boolean(selectedDestinationCode)
      && requestNoValid
      && !state.isMutating,
    [
      amountCny,
      requestNoValid,
      requiresBankName,
      selectedDestinationCode,
      state.isMutating,
      isAuthenticated,
      cashAvailable,
      trimmedAccountName,
      trimmedAccountNo,
      trimmedBankName,
    ],
  );

  function handleQuickRatio(ratio: number) {
    const value = Number((cashAvailable * ratio).toFixed(2));
    setAmountInput(String(value));
  }

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    void controller.withdrawCash({
      accountName: trimmedAccountName,
      accountNo: trimmedAccountNo,
      amountCny,
      ...(requiresBankName ? { bankName: trimmedBankName } : {}),
      destinationCode: selectedDestinationCode,
      remarks: selectedDestination
        ? formatWithdrawRemarks(formatWithdrawDestinationLabel(selectedDestination.code))
        : undefined,
      requestNo: trimmedRequestNo || undefined,
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(92vw,54rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
          <DialogTitle>{copy.withdrawDialog.title}</DialogTitle>
          <DialogDescription>{copy.withdrawDialog.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(88vh-9rem)] overflow-y-auto">
          <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
            {/* 左侧：提现表单 */}
            <div className="space-y-5">
              {!isAuthenticated ? (
                <StatusNotice title={copy.withdrawDialog.signInRequiredTitle} tone="warning">
                  {copy.withdrawDialog.signInRequiredDescription}
                </StatusNotice>
              ) : null}

              {/* 提现金额 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
                    htmlFor="claw-router-withdraw-amount"
                  >
                    {copy.withdrawDialog.amountLabel}
                  </label>
                  {isAuthenticated && cashAvailable > 0 ? (
                    <button
                      className="rounded-[var(--sdk-radius-pill)] text-xs font-medium text-[var(--sdk-color-brand-primary)] transition-colors hover:text-[var(--sdk-color-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)]"
                      onClick={() => handleQuickRatio(1)}
                      type="button"
                    >
                      {t('console.wallet.withdraw.all')}
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-[var(--sdk-color-text-muted)]">
                    ¥
                  </span>
                  <Input
                    aria-invalid={amountExceedsAvailable}
                    className="h-11 pl-8 text-base tabular-nums"
                    id="claw-router-withdraw-amount"
                    inputMode="decimal"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setAmountInput(sanitizeAmount(event.target.value))}
                    placeholder={copy.withdrawDialog.amountPlaceholder}
                    type="text"
                    value={amountInput}
                  />
                </div>
                {isAuthenticated && cashAvailable > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {QUICK_RATIOS.map((ratio) => {
                      const value = Number((cashAvailable * ratio).toFixed(2));
                      const isActive = amountCny > 0 && Math.abs(amountCny - value) < 0.005;
                      return (
                        <button
                          className={`rounded-[var(--sdk-radius-pill)] border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
                            isActive
                              ? 'border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-brand-primary)]'
                              : 'border-[var(--sdk-color-border-default)] text-[var(--sdk-color-text-secondary)] hover:bg-[var(--sdk-color-surface-panel-muted)]'
                          }`}
                          key={ratio}
                          onClick={() => handleQuickRatio(ratio)}
                          type="button"
                        >
                          {ratio === 1 ? t('console.wallet.withdraw.all') : `${ratio * 100}%`}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {amountExceedsAvailable ? (
                  <p className="text-xs text-[var(--sdk-color-state-danger)]">
                    {copy.withdrawDialog.insufficientDescription}
                  </p>
                ) : null}
              </div>

              {/* 提现方式 */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-[var(--sdk-color-text-primary)]">
                  {copy.withdrawDialog.withdrawDestinationLabel}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {destinations.map((destination) => (
                    <DestinationCard
                      code={destination.code}
                      description={formatWithdrawDestinationDescription(destination.code)}
                      isSelected={selectedDestinationCode === destination.code}
                      key={destination.id}
                      label={formatWithdrawDestinationLabel(destination.code)}
                      onSelect={() => setSelectedDestinationCode(destination.code)}
                    />
                  ))}
                </div>
              </div>

              {/* 收款账户信息 */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
                    htmlFor="claw-router-withdraw-account-name"
                  >
                    {copy.withdrawDialog.accountNameLabel}
                  </label>
                  <Input
                    id="claw-router-withdraw-account-name"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setAccountName(event.target.value)}
                    placeholder={copy.withdrawDialog.accountNamePlaceholder}
                    type="text"
                    value={accountName}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
                    htmlFor="claw-router-withdraw-account-number"
                  >
                    {copy.withdrawDialog.accountNoLabel}
                  </label>
                  <Input
                    id="claw-router-withdraw-account-number"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setAccountNo(event.target.value)}
                    placeholder={copy.withdrawDialog.accountNoPlaceholder}
                    type="text"
                    value={accountNo}
                  />
                </div>
              </div>

              {/* 开户行（仅银行卡）+ 请求号：保持 grid 2 列稳定，请求号在无开户行时占满整行，避免切换抖动 */}
              <div className="grid gap-4 sm:grid-cols-2">
                {requiresBankName ? (
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
                      htmlFor="claw-router-withdraw-bank-name"
                    >
                      {copy.withdrawDialog.bankNameLabel}
                    </label>
                    <Input
                      id="claw-router-withdraw-bank-name"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setBankName(event.target.value)}
                      placeholder={copy.withdrawDialog.bankNamePlaceholder}
                      type="text"
                      value={bankName}
                    />
                  </div>
                ) : null}
                <div className={`space-y-2 ${!requiresBankName ? 'sm:col-span-2' : ''}`}>
                  <label
                    className="text-sm font-medium text-[var(--sdk-color-text-primary)]"
                    htmlFor="claw-router-withdraw-request-no"
                  >
                    {copy.withdrawDialog.requestNoLabel}
                  </label>
                  <Input
                    aria-invalid={!requestNoValid}
                    id="claw-router-withdraw-request-no"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setRequestNo(event.target.value)}
                    placeholder={copy.withdrawDialog.requestNoPlaceholder}
                    type="text"
                    value={requestNo}
                  />
                  {!requestNoValid ? (
                    <p className="text-xs text-[var(--sdk-color-state-danger)]">
                      {copy.withdrawDialog.invalidRequestNoDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--sdk-color-text-muted)]">
                      {t('console.wallet.withdraw.requestNoHint')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：实时摘要侧栏 */}
            <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
              <div className="rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)] p-4 shadow-[var(--sdk-shadow-sm)]">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.withdrawDialog.availableCashEyebrow}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-[var(--sdk-color-text-primary)]">
                  {formatCurrencyCny(cashAvailable)}
                </div>
                <div
                  className={`mt-1 text-xs ${
                    amountExceedsAvailable
                      ? 'text-[var(--sdk-color-state-danger)]'
                      : 'text-[var(--sdk-color-text-secondary)]'
                  }`}
                >
                  {formatProjectedBalance(projectedBalance)}
                </div>
              </div>

              <div className="space-y-3 rounded-[var(--sdk-radius-panel)] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)] px-4 py-4">
                <SummaryRow
                  label={copy.withdrawDialog.amountLabel}
                  value={formatCurrencyCny(Number.isFinite(amountCny) && amountCny > 0 ? amountCny : 0)}
                />
                <SummaryRow
                  label={t('console.wallet.withdraw.fee')}
                  value={t('console.wallet.withdraw.feeFree')}
                  valueClassName="text-[var(--sdk-color-state-success)]"
                />
                <SummaryRow
                  label={t('console.wallet.withdraw.arrival')}
                  value={t('console.wallet.withdraw.arrivalValue')}
                />
                {selectedDestination ? (
                  <SummaryRow
                    label={copy.withdrawDialog.withdrawDestinationLabel}
                    value={formatWithdrawDestinationLabel(selectedDestination.code)}
                  />
                ) : null}
              </div>

              <div className="flex items-start gap-2 px-1">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sdk-color-state-success)]"
                  aria-hidden="true"
                />
                <p className="text-[0.7rem] leading-relaxed text-[var(--sdk-color-text-muted)]">
                  {t('console.wallet.withdraw.security')}
                </p>
              </div>
            </aside>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--sdk-color-border-subtle)] px-6 py-4 sm:justify-end">
          <Button onClick={() => onOpenChange?.(false)} type="button" variant="ghost">
            {copy.actions.cancel}
          </Button>
          <Button disabled={!canSubmit} loading={state.isMutating} onClick={handleSubmit} type="button">
            {copy.actions.confirmWithdraw}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DestinationCardProps {
  code: SdkworkWalletWithdrawDestinationCode;
  description: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}

function DestinationCard({ code, description, isSelected, label, onSelect }: DestinationCardProps) {
  const meta = DESTINATION_META[code];
  const Icon = meta?.icon ?? Wallet;

  return (
    <button
      className={`relative flex items-start gap-3 rounded-[var(--sdk-radius-field)] border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sdk-color-border-focus)] ${
        isSelected
          ? 'border-[var(--sdk-color-brand-primary)] bg-[var(--sdk-color-brand-primary-soft)]'
          : 'border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] hover:bg-[var(--sdk-color-surface-panel-muted)]'
      }`}
      onClick={onSelect}
      type="button"
    >
      {isSelected ? (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sdk-color-brand-primary)] text-[var(--sdk-color-text-inverse)]">
          <Check className="h-2.5 w-2.5" aria-hidden="true" strokeWidth={3} />
        </span>
      ) : null}
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
          isSelected ? meta?.activeIcon : meta?.idleIcon
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--sdk-color-text-primary)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--sdk-color-text-muted)]">
          {description}
        </span>
      </span>
    </button>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function SummaryRow({ label, value, valueClassName }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--sdk-color-text-secondary)]">{label}</span>
      <span
        className={`font-medium tabular-nums text-[var(--sdk-color-text-primary)] ${valueClassName ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}
