import { useTranslation } from 'react-i18next';

export type MarketingBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * 徽章色调 → Tailwind 语义令牌（设计规范 §2.1）：只用 `-50/10` 填充 +
 * `-600/-400` 文字；信息色使用 `sky`，不使用品牌强调色做状态语义。
 */
const badgeToneClassNames: Record<MarketingBadgeTone, string> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
};

export function marketingBadgeToneClassName(tone: MarketingBadgeTone): string {
  return badgeToneClassNames[tone];
}

export function MarketingValueBadge({
  label,
  tone = 'default',
  title,
}: {
  label: string;
  tone?: MarketingBadgeTone;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeToneClassNames[tone]}`}
      title={title}
    >
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
    return '—';
  }
  return t(`${prefix}.${raw.toUpperCase()}`, t(`${prefix}.${raw.toLowerCase()}`, raw));
}

/**
 * 状态语义域。同一个 `active` 在优惠券、批次、领取记录里的含义不同，
 * 颜色必须由「域 + 值」共同决定（设计规范 §2.6）。
 */
export type MarketingStatusDomain =
  | 'offer'
  | 'stock'
  | 'code'
  | 'codeBatch'
  | 'userCoupon'
  | 'application'
  | 'campaign'
  | 'referral'
  | 'redemptionAttempt'
  | 'generic';

/**
 * 域 → 值 → 色调映射。
 *
 * 规则：同一颜色不得同时表达「可用」和「已用」；未列出的值一律回退
 * `default`（slate）并原样展示文案，绝不猜测语义。
 */
const marketingStatusToneByDomain: Record<MarketingStatusDomain, Record<string, MarketingBadgeTone>> = {
  // offer / stock / code：active 生效中（emerald），disabled 已停用（slate）
  offer: { active: 'success', disabled: 'default', inactive: 'default' },
  stock: { active: 'success', disabled: 'default', inactive: 'default' },
  code: { active: 'success', disabled: 'default', inactive: 'default' },
  // code batch：generating 生成中（sky）/ ready 可用（emerald）/ failed 失败（red）
  codeBatch: {
    generating: 'info',
    pending: 'info',
    processing: 'info',
    running: 'info',
    ready: 'success',
    completed: 'success',
    succeeded: 'success',
    failed: 'danger',
    cancelled: 'default',
  },
  // user coupon：claimed 已领取（sky）/ redeemed 已核销（emerald）/ 失效族（slate-red）
  userCoupon: {
    claimed: 'info',
    locked: 'info',
    redeemed: 'success',
    used: 'success',
    expired: 'default',
    voided: 'danger',
    cancelled: 'danger',
    disabled: 'default',
    active: 'success',
  },
  // discount application：applied（sky）/ settled（emerald）/ released（slate）/ rolled_back（amber）
  application: {
    applied: 'info',
    settled: 'success',
    released: 'default',
    rolled_back: 'warning',
  },
  campaign: {
    draft: 'default',
    scheduled: 'info',
    active: 'success',
    paused: 'warning',
    ended: 'default',
    cancelled: 'danger',
    archived: 'default',
  },
  referral: { active: 'success', disabled: 'default', inactive: 'default' },
  // redemption attempt：succeeded 已发放（emerald）/ failed 兑换失败（red）。
  // 这是追加式证据台账，没有「已使用」语义，不能复用 userCoupon 的 redeemed。
  redemptionAttempt: { succeeded: 'success', failed: 'danger' },
  generic: { active: 'success', disabled: 'default', failed: 'danger' },
};

/** 域 → i18n 词表前缀；没有词表的域直接展示原始值。 */
const marketingStatusLabelPrefix: Partial<Record<MarketingStatusDomain, string>> = {
  offer: 'admin.marketing.promotions.status',
  stock: 'admin.marketing.promotions.status',
  code: 'admin.marketing.promotions.status',
  referral: 'admin.marketing.promotions.status',
  codeBatch: 'admin.marketing.enums.codeBatchStatus',
  userCoupon: 'admin.marketing.enums.userCouponStatus',
  application: 'admin.marketing.enums.applicationStatus',
  campaign: 'admin.marketing.enums.campaignStatus',
  redemptionAttempt: 'admin.marketing.enums.redemptionOutcome',
};

/** 状态值归一化：去空白 + 小写；非字符串按 `String()` 处理，未知值不抛错。 */
export function normalizeMarketingStatusValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/** 徽章色调：由域 + 值决定；未知值回退 `default`（slate）。 */
export function marketingStatusTone(domain: MarketingStatusDomain, value: unknown): MarketingBadgeTone {
  const normalized = normalizeMarketingStatusValue(value);
  if (!normalized) {
    return 'default';
  }
  return marketingStatusToneByDomain[domain][normalized] ?? 'default';
}

export interface MarketingStatusBadgeProps {
  status: unknown;
  /** 语义域；默认 `generic`（只按通用词表着色）。 */
  domain?: MarketingStatusDomain;
  /** 已本地化的文案；省略时按域词表解析，未知值原样展示。 */
  label?: string;
  /** offer/stock/code 域的 active 文案（兼容既有页面 props）。 */
  activeLabel?: string;
  inactiveLabel?: string;
}

/**
 * 域感知状态徽章。
 *
 * - 颜色由「域 + 值」决定（设计规范 §2.6），不共用一套颜色；
 * - 始终渲染文字（颜色不是唯一信号，无障碍要求）；
 * - 未知值展示原始值 + slate，空值展示 `—`，不会返回空标签，也不会抛错。
 */
export function MarketingStatusBadge({
  status,
  domain = 'generic',
  label,
  activeLabel,
  inactiveLabel,
}: MarketingStatusBadgeProps) {
  const { t } = useTranslation();
  const raw = String(status ?? '').trim();
  const tone = marketingStatusTone(domain, raw);
  const text = label ?? resolveMarketingStatusLabel(raw, domain, activeLabel, inactiveLabel, t);
  return (
    <MarketingValueBadge
      label={text || '—'}
      tone={tone}
      title={raw || undefined}
    />
  );
}

function resolveMarketingStatusLabel(
  raw: string,
  domain: MarketingStatusDomain,
  activeLabel: string | undefined,
  inactiveLabel: string | undefined,
  t: MarketingTranslate,
): string {
  if (!raw) {
    return '—';
  }
  const normalized = normalizeMarketingStatusValue(raw);
  const hasLegacyLabels = activeLabel !== undefined || inactiveLabel !== undefined;
  if (hasLegacyLabels && (normalized === 'active' || normalized === 'disabled' || normalized === 'inactive')) {
    // 既有页面把本地化文案当 props 传入；只在值确实命中 active/disabled 时使用，
    // 未知值必须原样展示，不能被误标成 "Inactive"。
    if (normalized === 'active') {
      return activeLabel ?? raw;
    }
    return inactiveLabel ?? raw;
  }
  const prefix = marketingStatusLabelPrefix[domain];
  // 词表未覆盖的值由 marketingEnumLabel 回退原始值。
  return prefix ? marketingEnumLabel(normalized, prefix, t) : raw;
}

/**
 * 券码批次状态徽章（域 `codeBatch`）：`generating`/`ready`/`failed` 分色，
 * 其余值走批次词表并按 slate 展示原始值。
 */
export function MarketingBatchStatusBadge({ status }: { status: unknown }) {
  return <MarketingStatusBadge status={status} domain="codeBatch" />;
}
