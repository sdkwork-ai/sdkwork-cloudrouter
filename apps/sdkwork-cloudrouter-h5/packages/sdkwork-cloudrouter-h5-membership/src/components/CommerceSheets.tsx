import { CircleAlert, Wallet } from 'lucide-react';
import { useState } from 'react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import { formatMembershipCurrency, formatMembershipPointsValue } from '../format.js';
import type {
  MembershipPaymentMethod,
  MembershipRechargePackage,
  MembershipRechargeSettings,
} from '../runtime.js';
import { MobileSheet } from './MobileSheet.js';

export interface CheckoutPlanSummary {
  readonly name: string;
  readonly originalPriceLabel: string;
  readonly packageId: number;
  readonly periodLabel: string;
  readonly planRank: number;
  readonly priceLabel: string;
}

export interface PaymentMethodPickerProps {
  readonly onChange: (method: MembershipPaymentMethod) => void;
  readonly t: MembershipTranslate;
  readonly value: MembershipPaymentMethod;
}

/** WeChat Pay is the default on a phone; both methods settle in the H5 cashier. */
export function PaymentMethodPicker({ onChange, t, value }: PaymentMethodPickerProps) {
  const methods: ReadonlyArray<{ label: string; value: MembershipPaymentMethod }> = [
    { label: t('payment.wechat', '微信支付'), value: 'wechat_pay' },
    { label: t('payment.alipay', '支付宝'), value: 'alipay' },
  ];
  return (
    <fieldset className="mt-3">
      <legend className="text-[12px] font-medium text-ink-subtle">
        {t('payment.title', '支付方式')}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {methods.map((method) => {
          const selected = method.value === value;
          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 rounded-xl border px-3 text-[13px] font-medium ${
                selected
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-ink-muted'
              }`}
              key={method.value}
              onClick={() => onChange(method.value)}
              type="button"
            >
              {method.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface CheckoutSheetProps {
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onConfirm: (method: MembershipPaymentMethod) => void;
  readonly open: boolean;
  readonly plan: CheckoutPlanSummary | null;
  readonly submitting: boolean;
  readonly t: MembershipTranslate;
}

/**
 * Membership purchase sheet.
 *
 * The plan summary, amount, and period are the values the plan card showed; the
 * buyer confirms the payment method here and is then handed to the H5 cashier
 * (`mobile_cashier_h5`), which owns the QR/redirect protocol on both PC and H5.
 */
export function CheckoutSheet({
  error,
  onClose,
  onConfirm,
  open,
  plan,
  submitting,
  t,
}: CheckoutSheetProps) {
  const [method, setMethod] = useState<MembershipPaymentMethod>('wechat_pay');

  return (
    <MobileSheet
      closeLabel={t('close', '关闭')}
      description={t('checkout.description', '支付成功后会员权益立即生效')}
      footer={(
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="flex items-start gap-1.5 text-[12px] text-danger" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
          <button
            className="min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
            disabled={submitting || !plan}
            onClick={() => onConfirm(method)}
            type="button"
          >
            {submitting
              ? t('checkout.submitting', '正在创建订单…')
              : t('checkout.confirm', '确认支付')}
          </button>
        </div>
      )}
      onClose={onClose}
      open={open}
      title={t('checkout.title', '开通会员')}
    >
      {plan ? (
        <div data-membership-checkout>
          <div className="rounded-2xl border border-line bg-canvas p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{plan.name}</p>
                <p className="mt-0.5 text-[12px] text-ink-subtle">{plan.periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-bold leading-none text-brand">{plan.priceLabel}</p>
                {plan.originalPriceLabel ? (
                  <p className="mt-1 text-[11px] text-ink-subtle line-through">
                    {plan.originalPriceLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <PaymentMethodPicker onChange={setMethod} t={t} value={method} />

          <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-surface-elevated px-3 py-2 text-[11px] leading-snug text-ink-muted">
            <Wallet aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {t('checkout.cashierHint', '将跳转到收银台完成支付，支付结果以收银台为准。')}
          </p>
        </div>
      ) : null}
    </MobileSheet>
  );
}

export interface RechargeSelection {
  readonly amount?: string;
  readonly packageId?: string;
}

export interface TokenBankRechargeSheetProps {
  readonly balance: number | null;
  readonly error: string | null;
  readonly loading?: boolean;
  readonly onClose: () => void;
  readonly onConfirm: (selection: RechargeSelection, method: MembershipPaymentMethod) => void;
  readonly onRetry?: () => void;
  readonly open: boolean;
  readonly packages: readonly MembershipRechargePackage[];
  readonly settings?: MembershipRechargeSettings | null;
  readonly submitting: boolean;
  readonly t: MembershipTranslate;
}

/** Supported custom top-up range, mirroring the order service limits. */
const CUSTOM_RECHARGE_MIN = 1;
const CUSTOM_RECHARGE_MAX = 10_000;

export function parseCustomRechargeAmount(text: string): number | null {
  const normalized = text.trim();
  if (!/^\d+(?:\.\d{1,2})?$/u.test(normalized)) {
    return null;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < CUSTOM_RECHARGE_MIN || amount > CUSTOM_RECHARGE_MAX) {
    return null;
  }
  return amount;
}

/**
 * Token Bank compute-credit recharge sheet.
 *
 * Prices and credited points come from the order-owned recharge package catalog
 * (the same catalog the PC "购买算力积分" dialog lists), the custom top-up is
 * priced by the server's exchange rule, and payment is gated on the recharge
 * agreement — the three PC dialog behaviors the mobile sheet mirrors.
 */
export function TokenBankRechargeSheet({
  balance,
  error,
  loading = false,
  onClose,
  onConfirm,
  onRetry,
  open,
  packages,
  settings = null,
  submitting,
  t,
}: TokenBankRechargeSheetProps) {
  const [mode, setMode] = useState<'custom' | 'package'>('package');
  const [selectedId, setSelectedId] = useState<string>(packages[0]?.id ?? '');
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<MembershipPaymentMethod>('wechat_pay');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const effectiveId = selectedId || packages[0]?.id || '';
  const parsedAmount = parseCustomRechargeAmount(customAmount);
  const previewPoints = parsedAmount !== null && settings
    ? parsedAmount * settings.basePointsPerCny
    : null;
  const selectionValid = mode === 'custom' ? parsedAmount !== null : effectiveId.length > 0;
  const busy = submitting || loading;

  return (
    <MobileSheet
      closeLabel={t('close', '关闭')}
      description={t('recharge.description', '算力积分用于全模型调用，充值与使用规则以平台规则为准')}
      footer={(
        <div className="flex flex-col gap-2">
          {error ? (
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-start gap-1.5 text-[12px] text-danger" role="alert">
                <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
              {onRetry ? (
                <button
                  className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted"
                  onClick={onRetry}
                  type="button"
                >
                  {t('recharge.retry', '重新加载')}
                </button>
              ) : null}
            </div>
          ) : null}
          {!agreementAccepted ? (
            <p className="text-[11px] text-ink-subtle">
              {t('recharge.agreementRequired', '请先同意 Token Bank 充值服务协议')}
            </p>
          ) : null}
          <button
            className="min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
            disabled={busy || !selectionValid || !agreementAccepted}
            onClick={() => onConfirm(
              mode === 'custom' ? { amount: customAmount.trim() } : { packageId: effectiveId },
              method,
            )}
            type="button"
          >
            {busy
              ? t('recharge.submitting', '正在创建订单…')
              : t('recharge.confirm', '立即充值')}
          </button>
        </div>
      )}
      onClose={onClose}
      open={open}
      title={t('recharge.title', '购买算力积分')}
    >
      <div className="rounded-xl border border-line bg-canvas px-3 py-2.5">
        <p className="text-[11px] text-ink-subtle">{t('recharge.balance', '当前算力积分')}</p>
        <p className="mt-0.5 text-[20px] font-bold leading-none tabular-nums text-ink">
          {balance === null ? '--' : formatMembershipPointsValue(balance)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-surface-elevated p-1" role="tablist">
        {([
          { key: 'package', label: t('recharge.packageMode', '选择套餐') },
          { key: 'custom', label: t('recharge.customMode', '自定义金额') },
        ] as const).map((option) => {
          const selected = mode === option.key;
          return (
            <button
              aria-selected={selected}
              className={`min-h-9 rounded-full text-[12px] font-semibold ${
                selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
              }`}
              key={option.key}
              onClick={() => setMode(option.key)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {mode === 'package' ? (
        <>
          {loading && packages.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface-elevated px-3 py-6 text-center text-[13px] text-ink-subtle">
              {t('recharge.loading', '正在加载充值套餐…')}
            </p>
          ) : null}
          {!loading && packages.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface-elevated px-3 py-6 text-center text-[13px] text-ink-subtle">
              {t('recharge.empty', '暂无可购买的充值套餐')}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2" data-membership-recharge-packages>
              {packages.map((item) => {
                const selected = item.id === effectiveId;
                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-[5.5rem] rounded-xl border px-3 py-2.5 text-left ${
                      selected
                        ? 'border-brand bg-brand-soft'
                        : 'border-line bg-surface'
                    }`}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    <span className="block text-[15px] font-bold text-ink tabular-nums">
                      {formatMembershipPointsValue(item.points)}
                    </span>
                    <span className="block text-[10px] text-ink-subtle">
                      {t('recharge.pointsUnit', '算力积分')}
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold text-brand">
                      {formatMembershipCurrency(item.priceAmount, item.currencyCode)}
                    </span>
                    {item.bonusPoints > 0 ? (
                      <span className="mt-0.5 block text-[10px] text-emerald-600">
                        {t('recharge.bonus', '赠 {points} 算力积分').replace(
                          '{points}',
                          formatMembershipPointsValue(item.bonusPoints),
                        )}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-line bg-canvas px-3 py-3">
          <label className="block text-[12px] font-medium text-ink-subtle" htmlFor="token-bank-custom-amount">
            {t('recharge.customLabel', '自定义充值金额（元）')}
          </label>
          <input
            className="mt-1.5 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-brand"
            id="token-bank-custom-amount"
            inputMode="decimal"
            onChange={(event) => setCustomAmount(event.target.value)}
            placeholder={t('recharge.customPlaceholder', '1 – 10000')}
            value={customAmount}
          />
          <p className="mt-1 text-[10px] text-ink-subtle">
            {previewPoints !== null
              ? t('recharge.customPreview', '预计到账 {{points}} 算力积分').replace(
                '{{points}}',
                formatMembershipPointsValue(previewPoints),
              )
              : t('recharge.customHint', '金额范围 1 – 10000 元，到账额度以服务端为准')}
          </p>
        </div>
      )}

      <PaymentMethodPicker onChange={setMethod} t={t} value={method} />

      <button
        aria-pressed={agreementAccepted}
        className="mt-3 flex w-full items-start gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left"
        onClick={() => setAgreementAccepted((current) => !current)}
        type="button"
      >
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
            agreementAccepted
              ? 'border-brand bg-brand-fill text-white'
              : 'border-line-strong text-transparent'
          }`}
        >
          ✓
        </span>
        <span className="text-[11px] leading-snug text-ink-muted">
          {t('recharge.agreement', '我已阅读并同意《Token Bank 充值服务协议》')}
        </span>
      </button>
    </MobileSheet>
  );
}

export interface TokenBankDetailsSheetProps {
  readonly balance: number | null;
  readonly onClose: () => void;
  readonly onOpenRecharge: () => void;
  readonly onOpenRedeem: () => void;
  readonly open: boolean;
  readonly t: MembershipTranslate;
}

/** Balance + rules, mirroring the PC "算力积分详情" dialog. */
export function TokenBankDetailsSheet({
  balance,
  onClose,
  onOpenRecharge,
  onOpenRedeem,
  open,
  t,
}: TokenBankDetailsSheetProps) {
  const rules = [
    t('details.ruleMonthly', '订阅会员后，按套餐等级每月获得算力积分。'),
    t('details.ruleRedeem', '兑换码可为 Token Bank 充值算力额度、发放会员积分或激活订阅。'),
    t('details.ruleUsage', '算力积分用于模型调用抵扣，不可提现，使用规则以平台规则为准。'),
  ];
  return (
    <MobileSheet
      closeLabel={t('close', '关闭')}
      onClose={onClose}
      open={open}
      title={t('details.title', '算力积分详情')}
    >
      <div className="rounded-xl border border-line bg-canvas px-3 py-3">
        <p className="text-[11px] text-ink-subtle">{t('details.available', '可用算力积分')}</p>
        <p className="mt-1 text-[26px] font-bold leading-none tabular-nums text-ink">
          {balance === null ? '--' : formatMembershipPointsValue(balance)}
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {rules.map((rule) => (
          <li className="flex gap-2 text-[12px] leading-snug text-ink-muted" key={rule}>
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
            {rule}
          </li>
        ))}
      </ul>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className="min-h-11 rounded-full border border-brand text-[13px] font-semibold text-brand"
          onClick={onOpenRecharge}
          type="button"
        >
          {t('hero.buyPoints', '购买算力积分')}
        </button>
        <button
          className="min-h-11 rounded-full bg-brand-fill text-[13px] font-semibold text-on-brand"
          onClick={onOpenRedeem}
          type="button"
        >
          {t('hero.redeem', '会员兑换')}
        </button>
      </div>
    </MobileSheet>
  );
}

export interface RedeemFormProps {
  readonly error: string | null;
  readonly onSubmit: (code: string) => void;
  readonly resultMessage: string | null;
  readonly submitting: boolean;
  readonly t: MembershipTranslate;
}

/**
 * Coupon/code redemption form, shared by the membership sheet and the `/recharge`
 * "会员兑换" tab. One input, one action, and an explicit result line — matching
 * the PC "会员兑换" dialog's fields and outcome copy.
 */
export function RedeemForm({
  error,
  onSubmit,
  resultMessage,
  submitting,
  t,
}: RedeemFormProps) {
  const [code, setCode] = useState('');
  return (
    <div data-membership-redeem-form>
      <label className="block text-[12px] font-medium text-ink-subtle" htmlFor="membership-redeem-code">
        {t('redeem.codeLabel', '兑换码')}
      </label>
      <input
        autoComplete="off"
        className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-brand"
        id="membership-redeem-code"
        onChange={(event) => setCode(event.target.value)}
        placeholder={t('redeem.codePlaceholder', '请输入兑换码')}
        value={code}
      />
      {resultMessage ? (
        <p
          className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300"
          role="status"
        >
          {resultMessage}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 flex items-start gap-1.5 text-[12px] text-danger" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-[11px] leading-snug text-ink-subtle">
        {t('redeem.hint', '兑换码一次性使用，兑换结果与到账额度以服务端为准。')}
      </p>
      <button
        className="mt-4 min-h-12 w-full rounded-full bg-brand-fill text-[15px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
        disabled={submitting || !code.trim()}
        onClick={() => onSubmit(code.trim())}
        type="button"
      >
        {submitting ? t('redeem.submitting', '正在兑换…') : t('redeem.confirm', '立即兑换')}
      </button>
    </div>
  );
}

export interface RedeemSheetProps {
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onSubmit: (code: string) => void;
  readonly open: boolean;
  readonly resultMessage: string | null;
  readonly submitting: boolean;
  readonly t: MembershipTranslate;
}

/** The redemption form as a bottom sheet, opened from the membership hero. */
export function RedeemSheet({
  error,
  onClose,
  onSubmit,
  open,
  resultMessage,
  submitting,
  t,
}: RedeemSheetProps) {
  return (
    <MobileSheet
      closeLabel={t('close', '关闭')}
      description={t('redeem.description', '输入兑换码，可充值算力积分、发放会员积分或激活会员订阅')}
      onClose={onClose}
      open={open}
      title={t('redeem.title', '会员兑换')}
    >
      <RedeemForm
        error={error}
        onSubmit={onSubmit}
        resultMessage={resultMessage}
        submitting={submitting}
        t={t}
      />
    </MobileSheet>
  );
}

