import { useTranslation } from 'react-i18next';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  minorUnitsToYuan,
  readCouponBenefit,
  type CouponBenefitDisplay,
} from '../marketingService';

function benefitValueText(
  benefit: CouponBenefitDisplay,
  currencyCode: string,
  t: (key: string, fallback: string, options?: Record<string, string>) => string,
): string {
  switch (benefit.kind) {
    case 'token_bank_credit':
      return benefit.bonusAmount
        ? t('admin.marketing.coupon.summary.tokenBankWithBonus', '{{grant}} + {{bonus}} bonus', {
            grant: benefit.grantAmount ?? '-',
            bonus: benefit.bonusAmount,
          })
        : (benefit.grantAmount ?? '-');
    case 'points_credit':
      return t('admin.marketing.coupon.summary.points', '{{points}} pts', {
        points: benefit.grantPoints ?? '-',
      });
    case 'cash_credit':
      return t('admin.marketing.coupon.summary.cash', '{{amount}} {{currency}}', {
        amount: minorUnitsToYuan(benefit.grantAmount) || '-',
        currency: currencyCode || '-',
      });
    case 'subscription':
      return t('admin.marketing.coupon.summary.subscription', '{{period}} x {{days}}d', {
        period: benefit.period ?? '-',
        days: benefit.durationDays ?? '-',
      });
  }
}

/**
 * 券权益摘要：类型名（i18n）+ 权益值。用于列表与详情展示，
 * 对齐不同券类型（额度/赠送、积分、现金、订阅周期）的差异化表达。
 */
export function CouponBenefitSummary({ record }: { record: ApiRecord }) {
  const { t } = useTranslation();
  const benefit = readCouponBenefit(record);
  if (!benefit) {
    return <span className="text-slate-400 dark:text-slate-500">-</span>;
  }
  const kindLabel = t(`admin.marketing.coupon.form.benefit.${benefit.kind}`);
  const currencyCode = String(record['currency_code'] ?? '');
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 dark:text-slate-500">{kindLabel}</span>
      <span className="text-slate-800 dark:text-slate-100">{benefitValueText(benefit, currencyCode, t)}</span>
    </div>
  );
}
