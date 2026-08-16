import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { humanizeCode, regionDisplayName, vendorDisplayName } from '../i18n/dataNames';
import type {
  OfficialPricingFormula,
  OfficialPricingRate,
  OfficialPricingRateTier,
} from '../types/pricing';

interface PricingRateTableProps {
  items: readonly OfficialPricingRate[];
}

export function PricingRateTable({ items }: PricingRateTableProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <>
      <div className="hidden overflow-x-auto border-y border-slate-200 bg-white md:block dark:border-white/10 dark:bg-[#0d0d0d]">
        <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
              <th className="w-[17%] px-4 py-3">{t('pricing.table.product')}</th>
              <th className="w-[11%] px-4 py-3">{t('pricing.table.provider')}</th>
              <th className="w-[13%] px-4 py-3">{t('pricing.table.operation')}</th>
              <th className="w-[13%] px-4 py-3">{t('pricing.table.meter')}</th>
              <th className="w-[16%] px-4 py-3">{t('pricing.table.capabilities')}</th>
              <th className="w-[14%] px-4 py-3">{t('pricing.table.price')}</th>
              <th className="w-[16%] px-4 py-3">{t('pricing.table.rules')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.map((rate) => (
              <tr key={`${rate.rateCode}:${rate.vendorCode}:${rate.regionCode}`} className="align-top hover:bg-slate-50/70 dark:hover:bg-white/[0.025]">
                <td className="px-4 py-4">
                  <div className="break-words text-sm font-semibold text-slate-950 dark:text-white">{rate.resourceCode}</div>
                  <div className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{rate.productDisplayName}</div>
                  {rate.catalogKey ? <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{rate.catalogKey}</div> : null}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{vendorDisplayName(rate.vendorCode, language)}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{regionDisplayName(rate.regionCode, language)}</div>
                  {rate.providerCode !== rate.vendorCode ? <div className="mt-1 text-xs text-slate-400">{vendorDisplayName(rate.providerCode, language)}</div> : null}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-800 dark:text-slate-200">{rate.operationDisplayName || humanizeCode(rate.operationCode)}</div>
                  <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{rate.operationCode}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{rate.meterDisplayName || humanizeCode(rate.meterCode)}</div>
                  <div className="mt-1 break-all font-mono text-[11px] text-slate-400">{rate.meterCode}</div>
                  <PolicyBadge>{calculationLabel(rate.calculationMode, t)}</PolicyBadge>
                </td>
                <td className="px-4 py-4">
                  <ModelCapabilities rate={rate} t={t} />
                </td>
                <td className="px-4 py-4">
                  <PriceValue rate={rate} t={t} />
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{timingLabel(rate.chargeTiming, t)}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{t('pricing.priceBook', { version: rate.priceBookVersion })}</div>
                </td>
                <td className="px-4 py-4">
                  <RateRules rate={rate} t={t} />
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{t('pricing.effective', { date: dateOnly(rate.effectiveFrom) })}</span>
                    <a
                      href={rate.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={t('pricing.source')}
                      aria-label={t('pricing.source')}
                      className="inline-flex items-center text-slate-500 hover:text-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-slate-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{t('pricing.updated', { date: formatDate(rate.sourceObservedAt, i18n.language) })}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((rate) => (
          <article key={`${rate.rateCode}:${rate.vendorCode}:${rate.regionCode}`} className="rounded-md border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0d0d0d]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-sm font-semibold text-slate-950 dark:text-white">{rate.resourceCode}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rate.productDisplayName}</p>
              </div>
              <BillabilityBadge billability={rate.billability} t={t} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <RateDetail label={t('pricing.table.provider')} value={`${vendorDisplayName(rate.vendorCode, language)} / ${regionDisplayName(rate.regionCode, language)}`} />
              <RateDetail label={t('pricing.table.operation')} value={rate.operationDisplayName || humanizeCode(rate.operationCode)} />
              <RateDetail label={t('pricing.table.meter')} value={rate.meterDisplayName || humanizeCode(rate.meterCode)} />
              <div>
                <dt className="text-slate-400">{t('pricing.table.price')}</dt>
                <dd className="mt-1"><PriceValue rate={rate} t={t} /></dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/5">
              <div className="text-xs text-slate-400">{t('pricing.table.capabilities')}</div>
              <div className="mt-2"><ModelCapabilities rate={rate} t={t} /></div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/5">
              <RateRules rate={rate} t={t} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>{t('pricing.effective', { date: dateOnly(rate.effectiveFrom) })}</span>
              <a href={rate.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-500 hover:text-lobster-500">
                {t('pricing.source')}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
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

function RateDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

function PriceValue({ rate, t }: { rate: OfficialPricingRate; t: TFunction }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-1 text-slate-950 dark:text-white">
        <span className="text-base font-semibold tabular-nums">{formatDecimal(rate.unitPrice)}</span>
        <span className="text-xs font-medium">{rate.currencyCode}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        / {formatDecimal(rate.unitSize)} {unitLabel(rate.unitCode, t)}
      </div>
    </>
  );
}

function RateRules({ rate, t }: { rate: OfficialPricingRate; t: TFunction }) {
  const formula = isPricingFormula(rate.formula) ? rate.formula : null;
  return (
    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
      <div className="flex flex-wrap gap-1.5">
        <BillabilityBadge billability={rate.billability} t={t} />
        <PolicyBadge>{calculationLabel(rate.calculationMode, t)}</PolicyBadge>
      </div>
      {rate.conditions.map((condition, index) => (
        <div key={`${condition.dimensionCode}:${condition.operator}:${index}`} className="break-words">
          <span className="font-medium text-slate-700 dark:text-slate-200">{humanizeCode(condition.dimensionCode)}</span>{' '}
          <span className="text-slate-400">{condition.operator}</span>{' '}
          <span>{humanizeConditionValue(condition.value)}</span>
        </div>
      ))}
      {rate.minimumQuantity !== '0' ? <div>{t('pricing.minimum', { value: formatDecimal(rate.minimumQuantity) })}</div> : null}
      {rate.quantityStep ? <div>{t('pricing.step', { value: formatDecimal(rate.quantityStep) })}</div> : null}
      {rate.tiers.length > 0 ? <TierSummary tiers={rate.tiers} t={t} /> : null}
      {formula ? (
        <div>
          <div className="font-medium text-slate-700 dark:text-slate-200">{t('pricing.formula', { code: formula.formulaCode })}</div>
          <div className="mt-1 font-mono text-[11px] text-slate-500">
            {t('pricing.formula.expression', {
              constant: formatDecimal(formula.constantUnits),
              coefficient: formatDecimal(formula.quantityCoefficient),
            })}
          </div>
          {formula.terms.map((term) => (
            <div key={term.termCode} className="mt-1 font-mono text-[11px] text-slate-500">
              + {formatDecimal(term.coefficient)} x {humanizeCode(term.dimensionCode)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TierSummary({ tiers, t }: { tiers: readonly OfficialPricingRateTier[]; t: TFunction }) {
  return (
    <div>
      <div className="font-medium text-slate-700 dark:text-slate-200">{t('pricing.tiers')}</div>
      <div className="mt-1 space-y-1">
        {tiers.map((tier) => (
          <div key={tier.tierCode} className="text-[11px] text-slate-500 dark:text-slate-400">
            {tier.upperBound
              ? t('pricing.tier.range', { lower: formatDecimal(tier.lowerBound), upper: formatDecimal(tier.upperBound) })
              : t('pricing.tier.openRange', { lower: formatDecimal(tier.lowerBound) })}
            {': '}{formatDecimal(tier.unitPrice)} {tier.currencyCode} / {formatDecimal(tier.unitSize)}
            {tier.flatAmount !== '0' ? ` ${t('pricing.tier.flat', { amount: `${formatDecimal(tier.flatAmount)} ${tier.currencyCode}` })}` : ''}
          </div>
        ))}
      </div>
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
    <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${className}`}>
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
      {hasTokens ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          {contextTokens ? <span>{t('pricing.tokens.context', { value: formatCompactTokens(contextTokens) })}</span> : null}
          {maxOutputTokens ? <span>{t('pricing.tokens.maxOutput', { value: formatCompactTokens(maxOutputTokens) })}</span> : null}
        </div>
      ) : null}
      {hasFeatures ? (
        <div className="flex flex-wrap gap-1.5">
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
  return <span className="mt-2 inline-flex rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">{children}</span>;
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

function humanizeConditionValue(value: string): string {
  if (value.startsWith('[') || value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String).join(', ');
    } catch {
      return value;
    }
  }
  return value;
}

function unitLabel(unitCode: string, t: TFunction): string {
  const normalized = unitCode.trim().toLowerCase();
  const knownUnits = new Set(['api_request', 'api_result', 'token', 'second', 'character', 'image', 'megapixel', 'unit']);
  return knownUnits.has(normalized) ? t(`pricing.unit.${normalized}`) : humanizeCode(unitCode);
}

function calculationLabel(mode: OfficialPricingRate['calculationMode'], t: TFunction): string {
  return t(`pricing.calculation.${mode}`);
}

function timingLabel(timing: OfficialPricingRate['chargeTiming'], t: TFunction): string {
  return t(`pricing.timing.${timing}`);
}

function dateOnly(value: string): string {
  return value.match(/^\d{4}-\d{2}-\d{2}/u)?.[0] ?? value;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? dateOnly(value) : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}
