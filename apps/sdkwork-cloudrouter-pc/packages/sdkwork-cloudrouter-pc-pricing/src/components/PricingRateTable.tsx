import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { humanizeCode, regionDisplayName, vendorDisplayName } from '../catalog/dataNames';
import { groupRatesByModel, type ModelGroup } from '../types/compare';
import type { OfficialPricingFormula, OfficialPricingRate } from '../types/pricing';
import {
  pricingGroupMultiplier,
  pricingGroupsServingRates,
  type PricingGroupOption,
} from '../types/pricingGroup';
import { multiplyPriceByMultiplier } from '../types/pricingPrice';
import {
  formatPricingScheduleLines,
  pricingRateIsActiveAt,
  pricingRateVariantKey,
  pricingRateVariantLabelKey,
} from '../types/pricingVariant';

interface PricingRateTableProps {
  items: readonly OfficialPricingRate[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelection: (rate: OfficialPricingRate) => void;
  /** 参与列计算的分组（已按标签/分组筛选收窄；空表示不展示分组列）。 */
  groups: readonly PricingGroupOption[];
}

/**
 * 价格列表：**一行一个模型**，行内横向排列价格卡片。
 * 第一列固定是官方分组（默认分组，×1.0 官方价），其后每个账号分组一列，
 * 价格按该分组的销售倍率折算为真实销售价；分组列按倍率从低到高排序。
 */
export function PricingRateTable({ items, selectedKeys, onToggleSelection, groups }: PricingRateTableProps) {
  const { i18n } = useTranslation();
  const models = useMemo(() => groupRatesByModel(items), [items]);

  return (
    <div className="space-y-4" data-testid="pricing-model-rows">
      {models.map((model) => (
        <ModelPriceRow
          key={model.key}
          group={model}
          language={i18n.language}
          groups={groups}
          selectedKeys={selectedKeys}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}

function ModelPriceRow({
  group,
  language,
  groups,
  selectedKeys,
  onToggleSelection,
}: {
  group: ModelGroup;
  language: string;
  groups: readonly PricingGroupOption[];
  selectedKeys: ReadonlySet<string>;
  onToggleSelection: (rate: OfficialPricingRate) => void;
}) {
  const { t } = useTranslation();
  const rate = group.rates[0];
  const regions = uniqueValues(group.rates, (entry) => entry.regionCode);
  const regionGroups = useMemo(() => groupByRegion(group.rates), [group.rates]);
  const servingGroups = useMemo(
    () => pricingGroupsServingRates(groups, group.rates),
    [group.rates, groups],
  );
  const hasTiers = group.rates.some((entry) => entry.tiers.length > 0);
  const hasFormula = group.rates.some((entry) => isPricingFormula(entry.formula));
  const hasTimeWindow = group.rates.some((entry) => entry.rateVariant === 'time_window');
  const selected = selectedKeys.has(group.key);

  return (
    <article
      className={`rounded-xl border bg-white transition-colors dark:bg-[#0d0d0d] ${
        selected
          ? 'border-lobster-400/70 ring-1 ring-lobster-400/30 dark:border-lobster-500/45'
          : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelection(rate)}
            aria-label={t('pricing.compare.selectRow', { name: rate.resourceCode })}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/20"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-all text-sm font-semibold text-slate-950 dark:text-white">{rate.resourceCode}</h2>
              <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {t(`pricing.category.${group.category}`)}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {vendorDisplayName(rate.vendorCode, language)}
              </span>
            </div>
            <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{rate.productDisplayName}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {regions.map((code) => (
                <span
                  key={code}
                  className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {regionDisplayName(code, language)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <BillabilityBadge billability={rate.billability} t={t} />
          <span className="text-[11px] tabular-nums text-slate-400">
            {t('pricing.columns.groupCount', { count: servingGroups.length })}
          </span>
        </div>
      </header>

      <div
        className="mt-3 overflow-x-auto px-4 pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500/40"
        role="group"
        aria-label={rate.resourceCode}
        tabIndex={0}
      >
        <div className="flex min-w-max gap-2.5">
          <PriceColumn
            title={t('pricing.columns.official')}
            subtitle="default"
            multiplier="1"
            regionGroups={regionGroups}
            language={language}
            t={t}
            official
          />
          {servingGroups.map((pricingGroup) => (
            <PriceColumn
              key={pricingGroup.code}
              title={pricingGroup.name}
              subtitle={pricingGroup.code}
              multiplier={pricingGroupMultiplier(pricingGroup)}
              regionGroups={regionGroups}
              language={language}
              t={t}
            />
          ))}
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 dark:border-white/5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ModelCapabilities rate={rate} t={t} />
          <span className="flex flex-wrap gap-1.5">
            {uniqueValues(group.rates, (entry) => entry.calculationMode).map((mode) => (
              <PolicyBadge key={mode}>{calculationLabel(mode, t)}</PolicyBadge>
            ))}
            {hasTiers ? <PolicyBadge>{t('pricing.policy.tiers')}</PolicyBadge> : null}
            {hasFormula ? <PolicyBadge>{t('pricing.policy.formula')}</PolicyBadge> : null}
            {hasTimeWindow ? <PolicyBadge>{t('pricing.policy.timeWindow')}</PolicyBadge> : null}
          </span>
        </div>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
          <span>{t('pricing.policy.rateCount', { count: group.rates.length })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('pricing.effective', { date: dateOnly(rate.effectiveFrom) })}</span>
          <a
            href={rate.sourceUrl}
            target="_blank"
            rel="noreferrer"
            title={t('pricing.source')}
            aria-label={t('pricing.source')}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-slate-400"
          >
            {t('pricing.source')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </span>
      </footer>
    </article>
  );
}

/**
 * 单个价格列（官方分组或某个账号分组）：同一模型的全部区域/计量行，
 * 组列的价格 = 官方价 × 该分组销售倍率。
 */
function PriceColumn({
  title,
  subtitle,
  multiplier,
  regionGroups,
  language,
  t,
  official = false,
}: {
  title: string;
  subtitle: string;
  multiplier: string;
  regionGroups: ReadonlyArray<[string, OfficialPricingRate[]]>;
  language: string;
  t: TFunction;
  official?: boolean;
}) {
  const isOfficial = official;
  return (
    <section
      aria-label={title}
      className={`w-60 shrink-0 rounded-lg border p-3 ${
        isOfficial
          ? 'border-lobster-200/80 bg-lobster-50/50 dark:border-lobster-500/25 dark:bg-lobster-500/[0.06]'
          : 'border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]'
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-semibold text-slate-900 dark:text-white" title={title}>{title}</h3>
          <p className="truncate font-mono text-[10px] text-slate-400" title={subtitle}>{subtitle}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            isOfficial
              ? 'bg-lobster-500/15 text-lobster-700 dark:text-lobster-300'
              : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300'
          }`}
        >
          ×{formatDecimal(multiplier)}
        </span>
      </header>
      <div className="mt-2 space-y-2">
        {regionGroups.map(([regionCode, rates]) => (
          <div key={regionCode}>
            {regionGroups.length > 1 ? (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {regionDisplayName(regionCode, language)}
              </div>
            ) : null}
            <div className="space-y-1.5">
              {rates.map((entry) => (
                <ColumnPriceLine key={entry.rateCode} entry={entry} multiplier={multiplier} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ColumnPriceLine({ entry, multiplier, t }: { entry: OfficialPricingRate; multiplier: string; t: TFunction }) {
  const variant = pricingRateVariantKey(entry);
  const active = pricingRateIsActiveAt(entry);
  const scheduleLines = formatPricingScheduleLines(entry.schedule, t);
  const price = multiplyPriceByMultiplier(entry.unitPrice, multiplier);
  const officialPrice = formatDecimal(entry.unitPrice);
  const discounted = multiplier !== '1';
  const title = scheduleLines.length > 0 ? scheduleLines.join('\n') : undefined;

  return (
    <div title={title}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          {variant !== 'standard' ? (
            <span
              className={`inline-flex shrink-0 rounded border px-1 text-[9px] font-semibold ${
                active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300'
              }`}
            >
              {t(pricingRateVariantLabelKey(variant))}
            </span>
          ) : null}
          <span className="truncate">{entry.meterDisplayName || humanizeCode(entry.meterCode)}</span>
        </span>
        <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-950 dark:text-white">{price}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2 text-[10px] text-slate-400">
        <span className="truncate">
          {entry.currencyCode} / {formatDecimal(entry.unitSize)} {unitLabel(entry.unitCode, t)}
        </span>
        {discounted ? (
          <span
            className="shrink-0 tabular-nums"
            title={t('pricing.columns.officialPriceTitle', { price: officialPrice, multiplier })}
          >
            {t('pricing.columns.originalPrice', { price: officialPrice })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function uniqueValues<T>(rates: readonly OfficialPricingRate[], pick: (rate: OfficialPricingRate) => T): T[] {
  return [...new Set(rates.map(pick))];
}

/**
 * Group a model's rates by region while preserving first-seen region order,
 * so each card column renders one region block instead of repeating the region
 * on every price line.
 */
function groupByRegion(rates: readonly OfficialPricingRate[]): Array<[string, OfficialPricingRate[]]> {
  const order: string[] = []; const buckets = new Map<string, OfficialPricingRate[]>();
  for (const rate of rates) {
    const list = buckets.get(rate.regionCode);
    if (list) {
      list.push(rate);
    } else {
      order.push(rate.regionCode);
      buckets.set(rate.regionCode, [rate]);
    }
  }
  return order.map((code) => [code, buckets.get(code)!]);
}

export function PricingPagination({
  page,
  totalPages,
  hasMore,
  onPageChange,
}: {
  page: number;
  totalPages?: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        title={t('pricing.pagination.previous')}
        aria-label={t('pricing.pagination.previous')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {totalPages
          ? t('pricing.pagination.page', { page, pages: totalPages })
          : t('pricing.pagination.single', { page })}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore}
        title={t('pricing.pagination.next')}
        aria-label={t('pricing.pagination.next')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function BillabilityBadge({ billability, t }: { billability: OfficialPricingRate['billability']; t: TFunction }) {
  const className = billability === 'chargeable'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
    : billability === 'free'
      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
  return (
    <span className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${className}`}>
      {t(`pricing.billability.${billability}`)}
    </span>
  );
}

function ModelCapabilities({ rate, t }: { rate: OfficialPricingRate; t: TFunction }) {
  const {
    inputModalities,
    outputModalities,
    contextTokens,
    maxOutputTokens,
    supportsStreaming,
    supportsTools,
    supportsJsonSchema,
    usageScopes,
  } = rate;
  const hasTokens = Boolean(contextTokens || maxOutputTokens);
  const hasFeatures = Boolean(supportsStreaming || supportsTools || supportsJsonSchema);
  if (!inputModalities?.length && !outputModalities?.length && !hasTokens && !hasFeatures && !usageScopes?.length) {
    return null;
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {inputModalities?.length ? (
        <span className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-400">{t('pricing.capability.input')}</span>
          {inputModalities.map((code) => <CapabilityBadge key={code}>{modalityLabel(code, t)}</CapabilityBadge>)}
        </span>
      ) : null}
      {outputModalities?.length ? (
        <span className="flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-400">{t('pricing.capability.output')}</span>
          {outputModalities.map((code) => <CapabilityBadge key={code}>{modalityLabel(code, t)}</CapabilityBadge>)}
        </span>
      ) : null}
      {contextTokens ? <FeatureBadge>{t('pricing.tokens.context', { value: formatCompactTokens(contextTokens) })}</FeatureBadge> : null}
      {maxOutputTokens ? <FeatureBadge>{t('pricing.tokens.maxOutput', { value: formatCompactTokens(maxOutputTokens) })}</FeatureBadge> : null}
      {supportsStreaming ? <FeatureBadge>{t('pricing.feature.streaming')}</FeatureBadge> : null}
      {supportsTools ? <FeatureBadge>{t('pricing.feature.tools')}</FeatureBadge> : null}
      {supportsJsonSchema ? <FeatureBadge>{t('pricing.feature.jsonSchema')}</FeatureBadge> : null}
      {usageScopes?.length ? (
        <span className="text-[11px] text-slate-400">{usageScopes.map((scope) => usageScopeLabel(scope, t)).join(' · ')}</span>
      ) : null}
    </span>
  );
}

function CapabilityBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      {children}
    </span>
  );
}

function FeatureBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300">
      {children}
    </span>
  );
}

function modalityLabel(code: string, t: TFunction): string {
  const translated = t(`pricing.modality.${code}`);
  return translated.startsWith('pricing.modality.') ? humanizeCode(code) : translated;
}

function usageScopeLabel(code: string, t: TFunction): string {
  const translated = t(`pricing.usageScope.${code}`);
  return translated.startsWith('pricing.usageScope.') ? humanizeCode(code) : translated;
}

export function formatCompactTokens(value: string): string {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return value || '0';
  if (parsed >= 1_000_000) {
    const millions = parsed / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (parsed >= 1_000) return `${Math.round(parsed / 1_000)}K`;
  return String(parsed);
}

function PolicyBadge({ children }: { children: string }) {
  return <span className="inline-flex rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">{children}</span>;
}

export function formatDecimal(value: string): string {
  const normalized = value.trim();
  if (!normalized.includes('.')) return normalized || '0';
  const trimmed = normalized.replace(/0+$/u, '').replace(/\.$/u, '');
  return trimmed || '0';
}

export function isPricingFormula(value: unknown): value is OfficialPricingFormula {
  return Boolean(value && typeof value === 'object' && 'formulaCode' in value && 'terms' in value);
}

function unitLabel(unitCode: string, t: TFunction): string {
  const normalized = unitCode.trim().toLowerCase();
  const knownUnits = new Set(['api_request', 'api_result', 'token', 'second', 'character', 'image', 'megapixel', 'unit']);
  return knownUnits.has(normalized) ? t(`pricing.unit.${normalized}`) : humanizeCode(unitCode);
}

function calculationLabel(mode: OfficialPricingRate['calculationMode'], t: TFunction): string {
  return t(`pricing.calculation.${mode}`);
}

function dateOnly(value: string): string {
  return value.match(/^\d{4}-\d{2}-\d{2}/u)?.[0] ?? value;
}
