export type MarketingBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const badgeToneClassNames: Record<MarketingBadgeTone, string> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
};

export function MarketingValueBadge({ label, tone = 'default' }: { label: string; tone?: MarketingBadgeTone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeToneClassNames[tone]}`}>
      {label}
    </span>
  );
}

export type MarketingTranslate = (key: string, fallback: string) => string;

/**
 * 后端枚举值 → i18n 文案：先按大写 key 查（如 offerType.COUPON），
 * 未命中再按小写 key 查（如 period.day、userCouponStatus.claimed），
 * 仍未命中时回退展示原始值。
 */
export function marketingEnumLabel(value: unknown, prefix: string, t: MarketingTranslate): string {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '-';
  }
  return t(`${prefix}.${raw.toUpperCase()}`, t(`${prefix}.${raw.toLowerCase()}`, raw));
}
