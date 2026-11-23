import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { vendorDisplayName } from '../catalog/dataNames';
import type { OfficialPricingValueFacet } from '../types/pricing';
import {
  orderVendorFacets,
  resolveVendorFacetView,
  totalVendorFacetCount,
  VENDOR_FACET_VISIBLE_LIMIT,
} from '../types/pricingVendor';

interface PricingVendorFilterProps {
  vendors: readonly OfficialPricingValueFacet[];
  vendorCode: string;
  onChange: (vendorCode: string) => void;
}

/**
 * 厂商筛选：把原来的 `全部厂商` 原生下拉框改成展开式分类展示（参考品牌行），
 * 厂商按价格条目数排序、带计数，默认铺开一行，超出部分用「更多」展开。
 * 厂商是价格页第一优先级维度，因此放在筛选区最上方。
 */
export function PricingVendorFilter({ vendors, vendorCode, onChange }: PricingVendorFilterProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const ordered = useMemo(
    () => orderVendorFacets(vendors, (code) => vendorDisplayName(code, i18n.language)),
    [i18n.language, vendors],
  );
  const view = resolveVendorFacetView(ordered, { expanded, selectedCode: vendorCode });
  const totalCount = totalVendorFacetCount(vendors);
  const canCollapse = expanded && ordered.length > VENDOR_FACET_VISIBLE_LIMIT;

  return (
    <div className="border-b border-slate-100 pb-3 dark:border-white/5" role="group" aria-label={t('pricing.filters.vendor')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {t('pricing.filters.vendor')}
        </span>
        <button
          type="button"
          aria-pressed={vendorCode === ''}
          onClick={() => onChange('')}
          className={vendorChipClass(vendorCode === '')}
        >
          {t('pricing.filters.allVendors')}
          <span className={`ml-1 tabular-nums ${vendorCode === '' ? 'text-white/80' : 'text-slate-400'}`}>({totalCount})</span>
        </button>
        {view.visible.map((facet) => {
          const active = vendorCode === facet.code;
          return (
            <button
              key={facet.code}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : facet.code)}
              className={vendorChipClass(active)}
            >
              {vendorDisplayName(facet.code, i18n.language)}
              <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>({facet.count})</span>
            </button>
          );
        })}
        {view.hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-slate-300 dark:hover:text-lobster-300"
          >
            {t('pricing.vendors.more', { count: view.hiddenCount })}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {canCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-expanded
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-slate-300 dark:hover:text-lobster-300"
          >
            {t('pricing.vendors.less')}
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function vendorChipClass(active: boolean): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 ${
    active
      ? 'border-lobster-500 bg-lobster-500 text-white'
      : 'border-slate-200 text-slate-600 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
  }`;
}
