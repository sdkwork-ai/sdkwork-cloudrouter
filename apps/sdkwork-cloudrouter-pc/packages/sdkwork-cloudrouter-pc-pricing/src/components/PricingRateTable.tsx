import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { humanizeCode, regionDisplayName, vendorDisplayName } from '../catalog/dataNames';
import { groupRatesByModel, type ModelGroup } from '../types/compare';
import type { OfficialPricingFormula, OfficialPricingRate } from '../types/pricing';
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
}

/**
 * 价格列表：每个模型一张卡片（参考“卡片式价格”展示），
 * 卡片内按区域列出各计量项价格、模型能力与计费策略，保留比价勾选。
 * 桌面端与移动端共用同一套卡片，不再维护独立的表格视图。
 */
export function PricingRateTable({ items, selectedKeys, onToggleSelection }: PricingRateTableProps) {
  const { i18n } = useTranslation();
  const groups = useMemo(() => groupRatesByModel(items), [items]);

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" data-testid="pricing-rate-cards">
      {groups.map((group) => (
        <ModelPriceCard
          key={group.key}
          group={group}
          language={i18n.language}
          selectedKeys={selectedKeys}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}

function ModelPriceCard({
  group,
  language,
  selectedKeys,
  onToggleSelection,
}: {
  group: ModelGroup;
  language: string;
  selectedKeys: ReadonlySet<string>;
  onToggleSelection: (rate: OfficialPricingRate) => void;
}) {
  const { t } = useTranslation();
  const rate = group.rates[0];
  const regions = uniqueValues(group.rates, (entry) => entry.regionCode);
  const regionGroups = useMemo(() => groupByRegion(group.rates), [group.rates]);
  const hasTiers = group.rates.some((entry) => entry.tiers.length > 0);
  const hasFormula = group.rates.some((entry) => isPricingFormula(entry.formula));
  const hasTimeWindow = group.rates.some((entry) => entry.rateVariant === 'time_window');
  const selected = selectedKeys.has(group.key);

  return (
    <article
      className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 transition-colors dark:bg-[#0d0d0d] ${
        selected
          ? 'border-lobster-400/70 ring-1 ring-lobster-400/30 dark:border-lobster-500/45'
          : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
      }`}
    >
      <header className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelection(rate)}
          aria-label={t('pricing.compare.selectRow', { name: rate.resourceCode })}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/20"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-all text-sm font-semibold text-slate-950 dark:text-white">{rate.resourceCode}</h2>
            <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {t(`pricing.category.${group.category}`)}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{rate.productDisplayName}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-200">{vendorDisplayName(rate.vendorCode, language)}</span>
            <span className="flex flex-wrap gap-1">
              {regions.map((code) => (
                <span
                  key={code}
                  className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {regionDisplayName(code, language)}
                </span>
              ))}
            </span>
          </div>
        </div>
        <BillabilityBadge billability={rate.billability} t={t} />
      </header>

      <div className="mt-3 flex-1 space-y-3 border-t border-slate-100 pt-3 dark:border-white/5">
        {regionGroups.map(([regionCode, entries]) => (
          <div key={regionCode}>
            {regionGroups.length > 1 ? (
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {regionDisplayName(regionCode, language)}
              </div>
            ) : null}
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <MeterPriceLine key={entry.rateCode} entry={entry} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
        <ModelCapabilities rate={rate} t={t} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {uniqueValues(group.rates, (entry) => entry.calculationMode).map((mode) => (
          <PolicyBadge key={mode}>{calculationLabel(mode, t)}</PolicyBadge>
        ))}
        {hasTiers ? <PolicyBadge>{t('pricing.policy.tiers')}</PolicyBadge> : null}
        {hasFormula ? <PolicyBadge>{t('pricing.policy.formula')}</PolicyBadge> : null}
        {hasTimeWindow ? <PolicyBadge>{t('pricing.policy.timeWindow')}</PolicyBadge> : null}
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-white/5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{t('pricing.policy.rateCount', { count: group.rates.length })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('pricing.effective', { date: dateOnly(rate.effectiveFrom) })}</span>
          <span aria-hidden="true">·</span>
          <span>{t('pricing.updated', { date: formatDate(rate.sourceObservedAt, language) })}</span>
        </span>
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
      </footer>
    </article>
  );
}

function uniqueValues<T>(rates: readonly OfficialPricingRate[], pick: (rate: OfficialPricingRate) => T): T[] {
  return [...new Set(rates.map(pick))];
}

/**
 * Groups a model's rates by region while preserving first-seen region order,
 * so each card renders one region block instead of repeating the region on
 * every price line.
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

function MeterPriceLine({ entry, t }: { entry: OfficialPricingRate; t: TFunction }): ReactNode {
  const variant = pricingRateVariantKey(entry);
  const scheduleLines = formatPricingScheduleLines(entry.schedule, t);
  const active = pricingRateIsActiveAt(entry);
  const title = scheduleLines.length > 0 ? scheduleLines.join('\n') : undefined;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs" title={title}>
      {variant !== 'standard' ? (
        <span
          className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[10px] font-semibold ${
            active
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300'
          }`}
        >
          {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> : null}
          {t(pricingRateVariantLabelKey(variant))}
        </span>
      ) : null}
      <span className="text-slate-600 dark:text-slate-300">{entry.meterDisplayName || humanizeCode(entry.meterCode)}</span>
      <span className="tabular-nums font-semibold text-slate-950 dark:text-white">{formatDecimal(entry.unitPrice)}</span>
      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{entry.currencyCode}</span>
      <span className="text-[10px] text-slate-400">
        / {formatDecimal(entry.unitSize)} {unitLabel(entry.unitCode, t)}
      </span>
    </div>
  );
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
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  }
  return (
    <div className="space-y-2 text-xs">
      {inputModalities?.length ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] text-slate-400">{t('pricing.capability.input')}</span>
          <span className="flex flex-wrap gap-1">
            {inputModalities.map((code) => <CapabilityBadge key={code}>{modalityLabel(code, t)}</CapabilityBadge>)}
          </span>
        </div>
      ) : null}
      {outputModalities?.length ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] text-slate-400">{t('pricing.capability.output')}</span>
          <span className="flex flex-wrap gap-1">
            {outputModalities.map((code) => <CapabilityBadge key={code}>{modalityLabel(code, t)}</CapabilityBadge>)}
          </span>
        </div>
      ) : null}
      {hasTokens || hasFeatures ? (
        <div className="flex flex-wrap gap-1.5">
          {contextTokens ? <FeatureBadge>{t('pricing.tokens.context', { value: formatCompactTokens(contextTokens) })}</FeatureBadge> : null}
          {maxOutputTokens ? <FeatureBadge>{t('pricing.tokens.maxOutput', { value: formatCompactTokens(maxOutputTokens) })}</FeatureBadge> : null}
          {supportsStreaming ? <FeatureBadge>{t('pricing.feature.streaming')}</FeatureBadge> : null}
          {supportsTools ? <FeatureBadge>{t('pricing.feature.tools')}</FeatureBadge> : null}
          {supportsJsonSchema ? <FeatureBadge>{t('pricing.feature.jsonSchema')}</FeatureBadge> : null}
        </div>
      ) : null}
      {usageScopes?.length ? (
        <div className="text-[11px] text-slate-400">{usageScopes.map((scope) => usageScopeLabel(scope, t)).join(' · ')}</div>
      ) : null}
    </div>
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

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? dateOnly(value) : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
