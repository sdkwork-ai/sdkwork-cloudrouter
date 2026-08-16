import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { regionDisplayName, vendorDisplayName } from '../i18n/dataNames';
import type {
  OfficialPricingMeterFacet,
  OfficialPricingRegionFacet,
  OfficialPricingValueFacet,
} from '../types/pricing';

interface PricingFiltersProps {
  searchQuery: string;
  vendorCode: string;
  regionCode: string;
  meterCode: string;
  vendors: readonly OfficialPricingValueFacet[];
  regions: readonly OfficialPricingRegionFacet[];
  meters: readonly OfficialPricingMeterFacet[];
  onSearchChange: (value: string) => void;
  onVendorChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onMeterChange: (value: string) => void;
  onClear: () => void;
}

export function PricingFilters(props: PricingFiltersProps) {
  const { t, i18n } = useTranslation();
  const hasFilters = Boolean(props.searchQuery || props.vendorCode || props.regionCode || props.meterCode);
  const language = i18n.language;

  return (
    <div className="border-y border-slate-200 bg-white py-4 dark:border-white/10 dark:bg-[#0d0d0d]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_11rem_15rem_auto]">
        <label className="relative block sm:col-span-2 xl:col-span-1">
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
        <FacetSelect
          label={t('pricing.filters.vendor')}
          allLabel={t('pricing.filters.allVendors')}
          value={props.vendorCode}
          options={props.vendors.map((item) => ({ value: item.code, label: vendorDisplayName(item.code, language), count: item.count }))}
          onChange={props.onVendorChange}
        />
        <FacetSelect
          label={t('pricing.filters.region')}
          allLabel={t('pricing.filters.allRegions')}
          value={props.regionCode}
          options={props.regions.map((item) => ({ value: item.code, label: regionDisplayName(item.code, language), count: item.count }))}
          onChange={props.onRegionChange}
        />
        <FacetSelect
          label={t('pricing.filters.meter')}
          allLabel={t('pricing.filters.allMeters')}
          value={props.meterCode}
          options={props.meters.map((item) => ({ value: item.code, label: item.displayName || item.code, count: item.count }))}
          onChange={props.onMeterChange}
        />
        <button
          type="button"
          onClick={props.onClear}
          disabled={!hasFilters}
          title={t('pricing.filters.clear')}
          aria-label={t('pricing.filters.clear')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
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
  options: ReadonlyArray<{ value: string; label: string; count: string }>;
  onChange: (value: string) => void;
}

function FacetSelect({ label, allLabel, value, options, onChange }: FacetSelectProps) {
  return (
    <label className="block min-w-0">
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
