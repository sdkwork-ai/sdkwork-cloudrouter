import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { regionDisplayName } from '../catalog/dataNames';
import { PricingGroupFilter } from './PricingGroupFilter';
import { PricingVendorFilter } from './PricingVendorFilter';
import type {
  OfficialPricingMeterFacet,
  OfficialPricingRegionFacet,
  OfficialPricingValueFacet,
} from '../types/pricing';
import {
  hasPricingGroupSelection,
  type PricingGroupOption,
  type PricingGroupSelection,
  type PricingGroupTagFacet,
  type PricingGroupTypeCode,
} from '../types/pricingGroup';

interface PricingFiltersProps {
  searchQuery: string;
  vendorCode: string;
  regionCode: string;
  meterCode: string;
  currencyCode: string;
  vendors: readonly OfficialPricingValueFacet[];
  regions: readonly OfficialPricingRegionFacet[];
  meters: readonly OfficialPricingMeterFacet[];
  currencies: readonly OfficialPricingValueFacet[];
  groups: readonly PricingGroupOption[];
  groupTagFacets: readonly PricingGroupTagFacet[];
  groupSelection: PricingGroupSelection;
  groupState: 'loading' | 'ready' | 'failed';
  onSearchChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onMeterChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onGroupTypesChange: (types: PricingGroupTypeCode[]) => void;
  onGroupTagsChange: (tags: string[]) => void;
  onGroupCodesChange: (codes: string[]) => void;
  onClearGroups: () => void;
  onClear: () => void;
}

/**
 * 价格页筛选区：搜索、分组、区域、计量、币种在同一行，分组不再占据独立面板，
 * 改为悬停/点击展开的浮层（PricingGroupFilter）。清除按钮一次清空全部筛选。
 */
export function PricingFilters(props: PricingFiltersProps) {
  const { t, i18n } = useTranslation();
  const hasFilters = Boolean(
    props.searchQuery
    || props.vendorCode
    || props.regionCode
    || props.meterCode
    || props.currencyCode,
  ) || hasPricingGroupSelection(props.groupSelection);
  const language = i18n.language;

  return (
    <div className="border-y border-slate-200 bg-white py-4 dark:border-white/10 dark:bg-[#0d0d0d]">
      <PricingVendorFilter
        vendors={props.vendors}
        vendorCode={props.vendorCode}
        onChange={props.onVendorChange}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative block min-w-[14rem] flex-1 basis-64">
          <span className="sr-only">{t('pricing.search')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={props.searchQuery}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder={t('pricing.search')}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#151515] dark:text-white"
          />
        </label>
        <PricingGroupFilter
          groups={props.groups}
          tagFacets={props.groupTagFacets}
          selection={props.groupSelection}
          state={props.groupState}
          onTypesChange={props.onGroupTypesChange}
          onTagsChange={props.onGroupTagsChange}
          onGroupCodesChange={props.onGroupCodesChange}
          onClear={props.onClearGroups}
        />
        <FacetSelect
          label={t('pricing.filters.region')}
          allLabel={t('pricing.filters.allRegions')}
          value={props.regionCode}
          className="w-full sm:w-[9.5rem]"
          options={props.regions.map((item) => ({ value: item.code, label: regionDisplayName(item.code, language), count: item.count }))}
          onChange={props.onRegionChange}
        />
        <FacetSelect
          label={t('pricing.filters.meter')}
          allLabel={t('pricing.filters.allMeters')}
          value={props.meterCode}
          className="w-full sm:w-[10.5rem]"
          options={props.meters.map((item) => ({ value: item.code, label: item.displayName || item.code, count: item.count }))}
          onChange={props.onMeterChange}
        />
        <FacetSelect
          label={t('pricing.filters.currency')}
          allLabel={t('pricing.filters.allCurrencies')}
          value={props.currencyCode}
          className="w-full sm:w-[7.5rem]"
          options={props.currencies.map((item) => ({ value: item.code, label: item.code, count: item.count }))}
          onChange={props.onCurrencyChange}
        />
        <button
          type="button"
          onClick={props.onClear}
          disabled={!hasFilters}
          title={t('pricing.filters.clear')}
          aria-label={t('pricing.filters.clear')}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface FacetSelectProps {
  label: string;
  allLabel: string;
  value: string;
  className?: string;
  options: ReadonlyArray<{ value: string; label: string; count: string }>;
  onChange: (value: string) => void;
}

function FacetSelect({ label, allLabel, value, className, options, onChange }: FacetSelectProps) {
  return (
    <label className={`block min-w-0 shrink-0 ${className ?? ''}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#151515] dark:text-white"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}
