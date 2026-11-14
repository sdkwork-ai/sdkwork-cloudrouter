import { useTranslation } from 'react-i18next';
import {
  Ban,
  Boxes,
  CreditCard,
  FlaskConical,
  Globe2,
  Landmark,
  Monitor,
  Scale,
  Search,
  Smartphone,
  Undo2,
  Wallet,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import type { AdminResourceColumn, AdminResourceRecord } from '@sdkwork/cloudroutes-pc-commons';
import { PaymentProviderBrandTile } from './PaymentProviderBrand';
import {
  formatLocalizedName,
  formatPaymentDateTime,
  formatPaymentEnumValue,
  type PaymentTranslate,
} from '../paymentFormat';

/**
 * Cells shared by every operator-facing payment list.
 *
 * The rule this file encodes: **a provider is recognised by its official brand
 * mark, never by a raw code alone**. The inventory, methods, channels, and route
 * rules all lead with the same tile, so an operator can scan a page and know the
 * acquirer before reading a single word.
 *
 * Every list field that is genuinely unbounded (markets, currencies, capability
 * sets) is bounded here with a `+N` counter, because an unbounded comma list is
 * what turned the previous tables into identical truncated rows.
 */

/** Markets/currencies rendered before the `+N` overflow. */
const INLINE_CODE_LIMIT = 3;
/** Capabilities rendered before the `+N` overflow. */
const INLINE_CAPABILITY_LIMIT = 2;

const PROVIDER_TYPE_ICONS: Readonly<Record<string, LucideIcon>> = {
  card: CreditCard,
  wallet: Wallet,
  bank: Landmark,
  sandbox: FlaskConical,
};

const CAPABILITY_ICONS: Readonly<Record<string, LucideIcon>> = {
  payment_intent: CreditCard,
  payment_query: Search,
  payment_close: Ban,
  refund: Undo2,
  webhook: Webhook,
  reconciliation: Scale,
};

const SCENE_ICONS: Readonly<Record<string, LucideIcon>> = {
  app: Smartphone,
  web: Monitor,
  mini_program: Boxes,
  api: Globe2,
};

type Tone = { pill: string; dot?: string };

const STATUS_TONES: Readonly<Record<string, Tone>> = {
  active: {
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  inactive: {
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  disabled: {
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  deprecated: {
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  neutral: {
    pill: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
};

const NEUTRAL_CHIP =
  'border border-slate-200/80 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300';
const NEUTRAL_CHIP_ICON = 'text-slate-400 dark:text-slate-500';

function readStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function readText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function EmptyCell() {
  return <span className="text-slate-400 dark:text-slate-600">—</span>;
}

/** Small neutral chip used for enum-ish single values (scope, scene, platform). */
export function PaymentMetaChip({
  icon: Icon,
  label,
}: {
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${NEUTRAL_CHIP}`}
    >
      {Icon ? <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${NEUTRAL_CHIP_ICON}`} /> : null}
      {label}
    </span>
  );
}

/**
 * Compact provider reference for rows whose identity is something else (an
 * intent, an attempt, a refund). Brand mark plus the wire code, one line.
 */
export function PaymentProviderCompactCell({ value }: { value: unknown }) {
  const providerCode = readText(value);
  if (!providerCode) return <EmptyCell />;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PaymentProviderBrandTile providerCode={providerCode} size="sm" />
      <span className="truncate font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
        {providerCode}
      </span>
    </div>
  );
}

/** Two-line identity: brand mark, bold name, muted monospace sub-line. */
function IdentityCell({
  providerCode,
  title,
  subtitle,
}: {
  providerCode: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PaymentProviderBrandTile providerCode={providerCode} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate font-mono text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProviderIdentityCell({ record }: { record: AdminResourceRecord }) {
  const { t, i18n } = useTranslation();
  const providerCode = readText(record.providerCode);
  const displayName = formatLocalizedName(i18n, record, 'displayNameI18n', record.displayName);
  return (
    <IdentityCell
      providerCode={providerCode}
      subtitle={providerCode || t('admin.commerce.payments.providers.value.unknown', 'Unknown provider')}
      title={displayName}
    />
  );
}

function ProviderTypeBadge({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const raw = readText(value);
  if (!raw) return <EmptyCell />;
  return (
    <PaymentMetaChip
      icon={PROVIDER_TYPE_ICONS[raw] ?? Boxes}
      label={formatPaymentEnumValue(t, 'admin.commerce.payments.value.providerType', raw)}
    />
  );
}

/**
 * Bounded code list (markets, currencies). Codes stay monospace so `US`/`USD`
 * line up vertically down the column and scan faster than prose. The overflow
 * counter is decorative for assistive tech, and a localized "and N more"
 * follows it because a bare `+8` in a table cell has no announced meaning.
 */
function CodeListCell({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const items = readStringList(value);
  if (items.length === 0) return <EmptyCell />;
  const shown = items.slice(0, INLINE_CODE_LIMIT);
  const overflow = items.length - shown.length;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-mono text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300">
        {shown.join(' · ')}
      </span>
      {overflow > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="shrink-0 rounded bg-slate-100 px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-white/[0.08] dark:text-slate-400"
            title={items.join(', ')}
          >
            +{overflow}
          </span>
          <span className="sr-only">
            {t('admin.commerce.payments.providers.moreValues', 'And {{count}} more', { count: overflow })}
          </span>
        </>
      ) : null}
    </div>
  );
}

/**
 * Country and currency are one market, not two columns: `US · CNY` answers
 * "where and in what currency" in a single glance and gives the wide tables a
 * column back.
 */
function MarketCell({ record }: { record: AdminResourceRecord }) {
  const countryCode = readText(record.countryCode);
  const currencyCode = readText(record.currencyCode);
  if (!countryCode && !currencyCode) return <EmptyCell />;
  const parts = [countryCode, currencyCode].filter(Boolean);
  return (
    <span className="truncate font-mono text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300">
      {parts.join(' · ')}
    </span>
  );
}

function CapabilityChips({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const items = readStringList(value);
  if (items.length === 0) return <EmptyCell />;
  const labels = items.map((item) => formatPaymentEnumValue(t, 'admin.commerce.payments.value.capability', item));
  const shown = items.slice(0, INLINE_CAPABILITY_LIMIT);
  const overflow = items.length - shown.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((item, index) => {
        const Icon = CAPABILITY_ICONS[item];
        return (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-100/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
            key={`${item}-${index}`}
          >
            {Icon ? <Icon aria-hidden="true" className="h-3 w-3 text-slate-400 dark:text-slate-500" /> : null}
            {labels[index]}
          </span>
        );
      })}
      {overflow > 0 ? (
        <>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-md bg-slate-100/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
            title={labels.join(', ')}
          >
            +{overflow}
          </span>
          <span className="sr-only">
            {t('admin.commerce.payments.providers.moreValues', 'And {{count}} more', { count: overflow })}
          </span>
        </>
      ) : null}
    </div>
  );
}

function StatusPill({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const raw = readText(value);
  if (!raw) return <EmptyCell />;
  const tone = STATUS_TONES[raw] ?? STATUS_TONES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.pill}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {formatPaymentEnumValue(t, 'admin.commerce.payments.value.status', raw)}
    </span>
  );
}

function SceneBadge({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const raw = readText(value);
  if (!raw) return <EmptyCell />;
  return (
    <PaymentMetaChip
      icon={SCENE_ICONS[raw] ?? Boxes}
      label={formatPaymentEnumValue(t, 'admin.commerce.payments.value.scene', raw)}
    />
  );
}

/**
 * Risk level is a semantic severity, so it is toned like a status rather than
 * printed as bare text: `high` must not read the same as `low` at a glance.
 */
const RISK_TONE_KEYS: Readonly<Record<string, keyof typeof STATUS_TONES>> = {
  low: 'active',
  medium: 'inactive',
  high: 'disabled',
  critical: 'disabled',
  very_high: 'disabled',
};

function RiskBadge({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const raw = readText(value);
  if (!raw) return <EmptyCell />;
  const tone = STATUS_TONES[RISK_TONE_KEYS[raw] ?? 'neutral'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.pill}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {formatPaymentEnumValue(t, 'admin.commerce.payments.value.riskLevel', raw)}
    </span>
  );
}

function UpdatedCell({ value }: { value: unknown }) {
  return (
    <span className="whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400">
      {formatPaymentDateTime(value)}
    </span>
  );
}

function MonoCell({ value }: { value: unknown }) {
  const text = readText(value);
  if (!text) return <EmptyCell />;
  return (
    <span className="truncate font-mono text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300">
      {text}
    </span>
  );
}

function NumericCell({ value }: { value: unknown }) {
  const text = readText(value);
  if (!text) return <EmptyCell />;
  return <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300">{text}</span>;
}

/** Columns for the provider inventory. */
export function createPaymentProviderColumns(t: PaymentTranslate): AdminResourceColumn[] {
  return [
    {
      key: 'providerCode',
      label: t('admin.col.provider', 'Provider'),
      render: (_value, record) => <ProviderIdentityCell record={record} />,
    },
    {
      key: 'providerType',
      label: t('admin.col.type', 'Type'),
      render: (value) => <ProviderTypeBadge value={value} />,
    },
    {
      key: 'supportedCountries',
      label: t('admin.col.countries', 'Countries'),
      render: (value) => <CodeListCell value={value} />,
    },
    {
      key: 'supportedCurrencies',
      label: t('admin.col.currencies', 'Currencies'),
      render: (value) => <CodeListCell value={value} />,
    },
    {
      key: 'capabilities',
      label: t('admin.col.capabilities', 'Capabilities'),
      render: (value) => <CapabilityChips value={value} />,
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <StatusPill value={value} />,
    },
    {
      key: 'updatedAt',
      label: t('admin.col.updated', 'Updated'),
      render: (value) => <UpdatedCell value={value} />,
    },
  ] satisfies AdminResourceColumn[];
}

/**
 * Columns for the payment method catalogue. A method is shown as
 * "provider mark + method name + `provider · methodKey`" because an operator
 * reaches this list to answer "which checkout products exist and under which
 * acquirer", not to read `stripe_apple_pay`.
 */
export function createPaymentMethodColumns({
  t,
  i18n,
}: {
  t: PaymentTranslate;
  i18n: { language?: string };
}): AdminResourceColumn[] {
  const identity = (record: AdminResourceRecord) => {
    const providerCode = readText(record.providerCode);
    const methodKey = readText(record.methodKey);
    const displayName = formatLocalizedName(i18n, record, 'displayNameI18n', record.displayName);
    return (
      <IdentityCell
        providerCode={providerCode}
        subtitle={[providerCode, methodKey].filter(Boolean).join(' · ')}
        title={displayName || methodKey}
      />
    );
  };
  return [
    {
      key: 'methodKey',
      label: t('admin.commerce.payments.col.paymentMethod', 'Payment Method'),
      render: (_value, record) => identity(record),
    },
    {
      key: 'scope',
      label: t('admin.col.scope', 'Scope'),
      render: (value) => (
        <PaymentMetaChip
          label={formatPaymentEnumValue(t, 'admin.commerce.payments.value.scope', value)}
        />
      ),
    },
    {
      key: 'currencyCode',
      label: t('admin.commerce.payments.col.market', 'Market'),
      render: (_value, record) => <MarketCell record={record} />,
    },
    {
      key: 'sortOrder',
      label: t('admin.col.sort', 'Sort'),
      align: 'right',
      render: (value) => <NumericCell value={value} />,
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <StatusPill value={value} />,
    },
    {
      key: 'updatedAt',
      label: t('admin.col.updated', 'Updated'),
      render: (value) => <UpdatedCell value={value} />,
    },
  ] satisfies AdminResourceColumn[];
}

/**
 * Columns for routing channels. The channel is the join between a provider
 * account, a method, a scene, and a market, so each of those is shown as a
 * readable reference rather than an opaque id.
 */
export function createPaymentChannelColumns({
  t,
  i18n,
  methodLabelById,
}: {
  t: PaymentTranslate;
  i18n: { language?: string };
  methodLabelById: ReadonlyMap<string, { label: string; methodKey: string }>;
}): AdminResourceColumn[] {
  const methodCell = (record: AdminResourceRecord) => {
    const methodId = readText(record.methodId);
    const resolved = methodLabelById.get(methodId);
    const methodKey = readText(record.methodKey) || resolved?.methodKey || '';
    const label = resolved?.label || methodKey || methodId;
    if (!label) return <EmptyCell />;
    return (
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{label}</div>
        {methodKey ? (
          <div className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{methodKey}</div>
        ) : null}
      </div>
    );
  };
  const accountCell = (record: AdminResourceRecord) => {
    const accountName = readText(record.providerAccountName);
    const accountId = readText(record.providerAccountId);
    if (!accountName && !accountId) return <EmptyCell />;
    return (
      <span
        className="block max-w-[220px] truncate text-xs text-slate-600 dark:text-slate-300"
        title={accountName || accountId}
      >
        {accountName || accountId}
      </span>
    );
  };
  const identity = (record: AdminResourceRecord) => {
    const providerCode = readText(record.providerCode);
    const channelNo = readText(record.channelNo);
    const channelName = formatLocalizedName(i18n, record, 'channelNameI18n', record.channelName);
    return <IdentityCell providerCode={providerCode} subtitle={channelNo} title={channelName || channelNo} />;
  };
  return [
    {
      key: 'channelNo',
      label: t('admin.col.channel', 'Channel'),
      render: (_value, record) => identity(record),
    },
    {
      key: 'methodId',
      label: t('admin.commerce.payments.channels.col.method', 'Method'),
      render: (_value, record) => methodCell(record),
    },
    {
      key: 'providerAccountId',
      label: t('admin.col.account', 'Account'),
      render: (_value, record) => accountCell(record),
    },
    {
      key: 'sceneCode',
      label: t('admin.col.scene', 'Scene'),
      render: (value) => <SceneBadge value={value} />,
    },
    {
      key: 'countryCode',
      label: t('admin.commerce.payments.col.market', 'Market'),
      render: (_value, record) => <MarketCell record={record} />,
    },
    {
      key: 'priority',
      label: t('admin.col.priority', 'Priority'),
      align: 'right',
      render: (value) => <NumericCell value={value} />,
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <StatusPill value={value} />,
    },
    {
      key: 'updatedAt',
      label: t('admin.col.updated', 'Updated'),
      render: (value) => <UpdatedCell value={value} />,
    },
  ] satisfies AdminResourceColumn[];
}

export type RouteRuleChannelReference = {
  channelNo: string;
  providerCode: string;
  channelName?: string;
};

/**
 * Columns for route rules. A rule only stores `channelId`, which used to be
 * printed as a raw UUID, the single least useful cell in the console. Resolving
 * the channel (loaded once by the page) turns it into "brand mark + channel name
 * + channel number", and an unresolvable id is labelled as such instead of
 * masquerading as data.
 */
export function createPaymentRouteRuleColumns({
  t,
  channelById,
}: {
  t: PaymentTranslate;
  channelById: ReadonlyMap<string, RouteRuleChannelReference>;
}): AdminResourceColumn[] {
  const channelCell = (record: AdminResourceRecord) => {
    const channelId = readText(record.channelId);
    const resolved = channelById.get(channelId);
    if (!resolved) {
      if (!channelId) return <EmptyCell />;
      return (
        <div className="min-w-0">
          <span
            className="block max-w-[220px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-400"
            title={channelId}
          >
            {channelId}
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            {t('admin.commerce.payments.routeRules.channelUnresolved', 'Channel outside the loaded list')}
          </span>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 items-center gap-2">
        <PaymentProviderBrandTile providerCode={resolved.providerCode} size="sm" />
        <div className="min-w-0">
          <div
            className="truncate text-xs font-medium text-slate-700 dark:text-slate-200"
            title={resolved.channelName || resolved.channelNo}
          >
            {resolved.channelName || resolved.channelNo}
          </div>
          <div className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
            {resolved.channelNo}
          </div>
        </div>
      </div>
    );
  };
  return [
    {
      key: 'ruleNo',
      label: t('admin.col.rule', 'Rule'),
      render: (value) => <MonoCell value={value} />,
    },
    {
      key: 'channelId',
      label: t('admin.commerce.payments.routeRules.col.channel', 'Target Channel'),
      render: (_value, record) => channelCell(record),
    },
    {
      key: 'priority',
      label: t('admin.col.priority', 'Priority'),
      align: 'right',
      render: (value) => <NumericCell value={value} />,
    },
    {
      key: 'purchaseType',
      label: t('admin.commerce.payments.col.purchaseType', 'Purchase Type'),
      render: (value) => (readText(value) ? <MonoCell value={value} /> : <EmptyCell />),
    },
    {
      key: 'countryCode',
      label: t('admin.commerce.payments.col.market', 'Market'),
      render: (_value, record) => <MarketCell record={record} />,
    },
    {
      key: 'clientPlatform',
      label: t('admin.commerce.payments.col.clientPlatform', 'Client Platform'),
      render: (value) =>
        readText(value) ? <PaymentMetaChip label={readText(value)} /> : <EmptyCell />,
    },
    {
      key: 'riskLevel',
      label: t('admin.commerce.payments.col.riskLevel', 'Risk Level'),
      render: (value) => <RiskBadge value={value} />,
    },
    {
      key: 'status',
      label: t('admin.col.status', 'Status'),
      render: (value) => <StatusPill value={value} />,
    },
    {
      key: 'updatedAt',
      label: t('admin.col.updated', 'Updated'),
      render: (value) => <UpdatedCell value={value} />,
    },
  ] satisfies AdminResourceColumn[];
}
