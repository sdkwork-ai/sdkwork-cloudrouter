import { useTranslation } from 'react-i18next';
import { Check, Coins, Crown, Wallet, Zap } from 'lucide-react';
import type { CouponOfferBenefitKind } from '../marketingService';

interface CouponBenefitTypeSelectorProps {
  value: CouponOfferBenefitKind;
  onChange: (kind: CouponOfferBenefitKind) => void;
}

interface BenefitOption {
  kind: CouponOfferBenefitKind;
  icon: typeof Zap;
}

const BENEFIT_OPTIONS: BenefitOption[] = [
  { kind: 'token_bank_credit', icon: Zap },
  { kind: 'points_credit', icon: Coins },
  { kind: 'cash_credit', icon: Wallet },
  { kind: 'subscription', icon: Crown },
];

/**
 * 券类型卡片选择器：图标 + 名称 + 目标账户标签 + 一句话说明，
 * 对齐行业（美团/淘宝）专业券创建体验。
 */
export function CouponBenefitTypeSelector({ value, onChange }: CouponBenefitTypeSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {BENEFIT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = option.kind === value;
        return (
          <button
            key={option.kind}
            type="button"
            onClick={() => onChange(option.kind)}
            aria-pressed={selected}
            className={[
              'relative flex flex-col gap-1.5 rounded-md border p-3 text-left transition-colors',
              selected
                ? 'border-lobster-500 bg-lobster-50 dark:bg-lobster-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20',
            ].join(' ')}
          >
            {selected ? (
              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-lobster-600 text-white">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
            <span className="flex items-center gap-2">
              <Icon
                className={selected ? 'h-4 w-4 text-lobster-600' : 'h-4 w-4 text-slate-400 dark:text-slate-500'}
              />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {t(`admin.marketing.coupon.form.benefit.${option.kind}`)}
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                {t(`admin.marketing.coupon.form.benefit.account.${option.kind}`)}
              </span>
            </span>
            <span className="text-xs leading-snug text-slate-400 dark:text-slate-500">
              {t(`admin.marketing.coupon.form.benefit.desc.${option.kind}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
