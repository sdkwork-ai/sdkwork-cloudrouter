import { Check, Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { regionDisplayName, vendorDisplayName } from '../i18n/dataNames';
import { buildCompareModels, type CompareModel, type CompareModelReferencePrice } from '../services/compareService';
import { compareKeyOf, rateCategory } from '../types/compare';
import type { OfficialPricingRate } from '../types/pricing';
import { formatCompactTokens, formatDecimal } from './PricingRateTable';

interface PricingCompareDrawerProps {
  open: boolean;
  selections: readonly OfficialPricingRate[];
  onRemove: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function PricingCompareDrawer({
  open,
  selections,
  onRemove,
  onClear,
  onClose,
}: PricingCompareDrawerProps) {
  const { t, i18n } = useTranslation();
  const [currency, setCurrency] = useState('');
  const language = i18n.language;
  const category = selections.length > 0 ? rateCategory(selections[0]) : 'other';

  const models = useMemo(() => buildCompareModels(selections), [selections]);

  // 币种选项取自所有模型、所有区域的价格，统一一个币种下拉做跨区筛选。
  const currencyOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const model of models) {
      for (const price of model.prices) codes.add(price.currency);
    }
    return [...codes].sort();
  }, [models]);

  // 按首次出现顺序收集所有区域码，每个区域单独渲染一张比价表。
  const regionOrder = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const model of models) {
      for (const price of model.prices) {
        if (!seen.has(price.regionCode)) {
          seen.add(price.regionCode);
          order.push(price.regionCode);
        }
      }
    }
    return order;
  }, [models]);

  const selectedKeys = useMemo(() => new Set(selections.map(compareKeyOf)), [selections]);
  // 同一 model 可能对应多条 rate，按 key 去重用于头部 tag 渲染。
  const dedupedSelections = useMemo(() => {
    const seen = new Set<string>();
    return selections.filter((rate) => {
      const key = compareKeyOf(rate);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selections]);

  return (
    <div className={open ? 'fixed inset-0 z-50' : 'pointer-events-none fixed inset-0 z-50'} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('pricing.compare.title')}
        className={`absolute right-0 top-0 flex h-full w-[min(960px,92vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-[#0d0d0d] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-lobster-500/10 text-lobster-500">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('pricing.compare.title')}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {t('pricing.compare.subtitle', { category: t(`pricing.category.${category}`), count: selections.length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selections.length > 1 ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                {t('pricing.compare.clear')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('pricing.compare.close')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-2">
                {dedupedSelections.map((rate) => {
                  const key = compareKeyOf(rate);
                  const selected = selectedKeys.has(key);
                  if (!selected) return null;
                  return (
                    <div key={key} className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 dark:border-white/10 dark:bg-white/5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{rate.productDisplayName}</div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{vendorDisplayName(rate.vendorCode, language)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(key)}
                        aria-label={t('pricing.compare.remove', { name: rate.productDisplayName })}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {currencyOptions.length > 1 ? (
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t('pricing.compare.currency')}
                    <select
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#151515] dark:text-white"
                    >
                      <option value="">{t('pricing.compare.allCurrencies')}</option>
                      {currencyOptions.map((code) => (
                        <option key={code} value={code}>
                          {code} {currencySymbol(code)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            <CompareCapabilitiesTable models={models} t={t} />

            <h3 className="mb-2 mt-7 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
              {t('pricing.compare.section.prices')}
            </h3>
            {regionOrder.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-white/10">
                {t('pricing.compare.empty')}
              </p>
            ) : (
              <div className="space-y-6">
                {regionOrder.map((region) => (
                  <ComparePricesTable
                    key={region}
                    models={models}
                    region={region}
                    currency={currency}
                    t={t}
                  />
                ))}
              </div>
            )}

            <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">{t('pricing.compare.notice')}</p>
          </div>
      </aside>
    </div>
  );
}

function CompareCapabilitiesTable({ models, t }: { models: readonly CompareModel[]; t: TFunction }) {
  const rows: ReadonlyArray<{ key: string; label: string; render: (model: CompareModel) => React.ReactNode }> = [
    {
      key: 'inputModalities',
      label: t('pricing.compare.row.inputModalities'),
      render: (model) => <ModalityList codes={model.inputModalities} t={t} />,
    },
    {
      key: 'outputModalities',
      label: t('pricing.compare.row.outputModalities'),
      render: (model) => <ModalityList codes={model.outputModalities} t={t} />,
    },
    {
      key: 'contextTokens',
      label: t('pricing.compare.row.contextTokens'),
      render: (model) => (model.contextTokens ? formatCompactTokens(model.contextTokens) : '—'),
    },
    {
      key: 'maxOutputTokens',
      label: t('pricing.compare.row.maxOutputTokens'),
      render: (model) => (model.maxOutputTokens ? formatCompactTokens(model.maxOutputTokens) : '—'),
    },
    {
      key: 'streaming',
      label: t('pricing.compare.row.streaming'),
      render: (model) => (model.supportsStreaming === null ? '—' : <SupportMark supported={model.supportsStreaming} />),
    },
    {
      key: 'tools',
      label: t('pricing.compare.row.tools'),
      render: (model) => (model.supportsTools === null ? '—' : <SupportMark supported={model.supportsTools} />),
    },
    {
      key: 'jsonSchema',
      label: t('pricing.compare.row.jsonSchema'),
      render: (model) => (model.supportsJsonSchema === null ? '—' : <SupportMark supported={model.supportsJsonSchema} />),
    },
    {
      key: 'usageScopes',
      label: t('pricing.compare.row.usageScopes'),
      render: (model) => <UsageScopeList codes={model.usageScopes} t={t} />,
    },
  ];

  return (
    <section aria-label={t('pricing.compare.section.capabilities')}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <span className="h-4 w-1 rounded-full bg-lobster-500" aria-hidden="true" />
        {t('pricing.compare.section.capabilities')}
      </h3>
      <CompareTable
        columns={models}
        columnLabel={(model) => model.modelId || model.displayName}
        rows={rows.map((row) => ({ key: row.key, label: row.label, render: row.render }))}
        emptyLabel={t('pricing.compare.empty')}
      />
    </section>
  );
}

function ComparePricesTable({
  models,
  region,
  currency,
  t,
}: {
  models: readonly CompareModel[];
  region: string;
  currency: string;
  t: TFunction;
}) {
  const { i18n } = useTranslation();
  const regionLabel = regionDisplayName(region, i18n.language);
  const meters = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const model of models) {
      for (const price of model.prices) {
        if (price.regionCode !== region) continue;
        if (currency && price.currency !== currency) continue;
        if (seen.has(price.billingMeter)) continue;
        seen.add(price.billingMeter);
        order.push(price.billingMeter);
      }
    }
    return order;
  }, [models, region, currency]);

  const priceOf = (model: CompareModel, meter: string): CompareModelReferencePrice | null => {
    const matches = model.prices.filter(
      (entry) => entry.regionCode === region && entry.billingMeter === meter && (!currency || entry.currency === currency),
    );
    return matches[0] ?? null;
  };

  return (
    <section aria-label={regionLabel} className="rounded-md border border-slate-200 dark:border-white/10">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{regionLabel}</span>
      </div>
      {meters.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          {t('pricing.compare.empty')}
        </p>
      ) : (
        <table className="w-full border-collapse text-left">
          <tbody>
            {meters.map((meter) => (
              <ComparePriceRow key={meter} meter={meter} models={models} priceOf={priceOf} t={t} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ComparePriceRow({
  meter,
  models,
  priceOf,
  t,
}: {
  meter: string;
  models: readonly CompareModel[];
  priceOf: (model: CompareModel, meter: string) => CompareModelReferencePrice | null;
  t: TFunction;
}) {
  const values = models
    .map((model) => ({ model, price: priceOf(model, meter) }))
    .filter((entry): entry is { model: CompareModel; price: CompareModelReferencePrice } => entry.price !== null);
  const currencies = new Set(values.map((entry) => entry.price.currency));
  const cheapest =
    values.length > 1 && currencies.size === 1 ? Math.min(...values.map((entry) => Number(entry.price.unitPrice))) : null;
  const unit = compareMeterUnit(meter, t);
  return (
    <tr className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
      <th scope="row" className="w-44 px-3 py-3 align-top text-left">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{compareMeterLabel(meter, t)}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">{unit}</div>
      </th>
      {models.map((model) => {
        const price = priceOf(model, meter);
        const isCheapest = price !== null && cheapest !== null && Number(price.unitPrice) === cheapest;
        return (
          <td key={model.key} className="px-3 py-3 align-top">
            {price === null ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              <div className={`inline-flex items-baseline gap-1 rounded px-1.5 py-0.5 tabular-nums ${isCheapest ? 'bg-emerald-50 dark:bg-emerald-500/10' : ''}`}>
                <span className={`text-sm font-semibold ${isCheapest ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-950 dark:text-white'}`}>
                  {currencySymbol(price.currency)} {formatDecimal(price.unitPrice)}
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{price.currency}</span>
                {isCheapest ? (
                  <span className="ml-1 inline-flex rounded bg-emerald-500 px-1 py-px text-[9px] font-bold uppercase text-white">{t('pricing.compare.cheapest')}</span>
                ) : null}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function currencySymbol(code: string): string {
  switch (code.trim().toUpperCase()) {
    case 'USD':
      return '$';
    case 'CNY':
      return '¥';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    case 'KRW':
      return '₩';
    case 'HKD':
      return 'HK$';
    default:
      return code;
  }
}

function CompareTable({
  columns,
  columnLabel,
  rows,
  emptyLabel,
}: {
  columns: readonly CompareModel[];
  columnLabel: (model: CompareModel) => string;
  rows: ReadonlyArray<{ key: string; label: string; render: (model: CompareModel) => React.ReactNode }>;
  emptyLabel: string;
}) {
  if (columns.length === 0) {
    return <p className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-white/10">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-white/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]">
            <th scope="col" className="w-44 px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400" />
            {columns.map((model) => (
              <th key={model.key} scope="col" className="min-w-36 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {columnLabel(model)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rendered = columns.map((model) => ({ key: model.key, value: row.render(model) }));
            const distinct = new Set(rendered.map((entry) => String(entry.value))).size > 1;
            return (
              <tr key={row.key} className="border-b border-slate-100 last:border-b-0 dark:border-white/5">
                <th scope="row" className="px-3 py-2.5 align-top text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                  {row.label}
                </th>
                {rendered.map((entry) => (
                  <td key={entry.key} className={`px-3 py-2.5 align-top text-xs ${distinct ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {entry.value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ModalityList({ codes, t }: { codes: readonly string[]; t: TFunction }) {
  if (codes.length === 0) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {codes.map((code) => (
        <span key={code} className="inline-flex rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {compareModalityLabel(code, t)}
        </span>
      ))}
    </span>
  );
}

function UsageScopeList({ codes, t }: { codes: readonly string[]; t: TFunction }) {
  if (codes.length === 0) return <span className="text-slate-400">—</span>;
  return <span className="text-slate-600 dark:text-slate-300">{codes.map((code) => compareUsageScopeLabel(code, t)).join(' · ')}</span>;
}

function SupportMark({ supported }: { supported: boolean }) {
  return supported ? (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-300 dark:text-slate-600">
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function compareModalityLabel(code: string, t: TFunction): string {
  const translated = t(`pricing.modality.${code}`);
  return translated.startsWith('pricing.modality.') ? code : translated;
}

function compareUsageScopeLabel(code: string, t: TFunction): string {
  const translated = t(`pricing.usageScope.${code}`);
  return translated.startsWith('pricing.usageScope.') ? code : translated;
}

function compareMeterLabel(meter: string, t: TFunction): string {
  const translated = t(`pricing.meter.${meter}`);
  return translated.startsWith('pricing.meter.') ? meter : translated;
}

export function compareMeterUnit(meter: string, t: TFunction): string {
  const code = meter.toLowerCase();
  if (code.includes('token')) return t('pricing.compare.unit.perMillionTokens');
  if (code.includes('character')) return t('pricing.compare.unit.perMillionCharacters');
  if (code.includes('second')) return t('pricing.compare.unit.perSecond');
  if (code.includes('minute')) return t('pricing.compare.unit.perMinute');
  if (code.includes('megapixel')) return t('pricing.compare.unit.perMegapixel');
  return t('pricing.compare.unit.perUnit');
}
