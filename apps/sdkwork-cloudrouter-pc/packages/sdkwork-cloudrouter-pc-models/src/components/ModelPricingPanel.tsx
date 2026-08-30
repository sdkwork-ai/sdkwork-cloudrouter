import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Model } from '../data/models';
import {
  deriveModelCatalogPricingView,
  deriveModelCatalogRegionPricingView,
  modelCatalogGroupFallbackLabel,
  modelCatalogGroupLabelKey,
  modelCatalogRegions,
  type ModelCatalogPricingCell,
  type ModelCatalogPriceType,
} from '../modelCatalog';
import { GroupSaleMultiplierBadge } from './GroupSaleMultiplierBadge';

/**
 * 模型定价面板（列表卡片与详情页共用）：
 * - 多区域（≥2）时展示区域 Tabs，区域名走 i18n；
 * - 模型所属分组存在销售倍率时，展示分组 Tabs（≥2 个有倍率的分组才显示），
 *   并支持「标准价 / 销售价」切换，销售价 = 参考价 × 所选分组的销售倍率；
 * - 峰谷（peak/offPeak）为价格类型保留分支：当前 app 端目录 referencePrices
 *   未暴露 tier 变体，故不在价格类型列表渲染；后续有数据时把 'peak'/'offPeak'
 *   加入 PRICE_TYPES 数组并在对应区域推导即可。
 * - 所有价格统一小数位，保证尾随 0 完全对齐。
 */
export function ModelPricingPanel({
  model,
  groupSaleMultipliers,
  showHeader = true,
}: {
  model: Model;
  groupSaleMultipliers?: ReadonlyMap<string, string>;
  showHeader?: boolean;
}) {
  const { t } = useTranslation();
  const regions = useMemo(() => modelCatalogRegions(model), [model]);
  // 模型所属、且在分组倍率表中有有效倍率的分组（决定销售价）。
  const saleGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const group of model.groups) {
      if (groupSaleMultipliers?.get(group)?.trim()) {
        groups.add(group);
      }
    }
    return Array.from(groups);
  }, [groupSaleMultipliers, model.groups]);

  // 价格类型：峰谷为保留分支，无数据时不渲染（见 PRICE_TYPES）。
  const PRICE_TYPES: ModelCatalogPriceType[] = ['standard', 'sale'];

  const [regionCode, setRegionCode] = useState<string>(() => regions[0]?.regionCode ?? '');
  const [priceType, setPriceType] = useState<ModelCatalogPriceType>('standard');
  const [selectedGroup, setSelectedGroup] = useState<string>(() => saleGroups[0] ?? '');

  const activeRegion = regions.some((region) => region.regionCode === regionCode)
    ? regionCode
    : (regions[0]?.regionCode ?? '');
  const activeGroup = saleGroups.includes(selectedGroup) ? selectedGroup : (saleGroups[0] ?? '');
  const saleMultiplier = activeGroup !== '' ? groupSaleMultipliers?.get(activeGroup) : undefined;
  const hasSaleGroups = saleGroups.length > 0;
  const saleOptions = priceType === 'sale' ? { saleMultiplier } : {};
  const pricing =
    activeRegion !== ''
      ? deriveModelCatalogRegionPricingView(model, activeRegion, saleOptions)
          ?? deriveModelCatalogPricingView(model, saleOptions)
      : deriveModelCatalogPricingView(model, saleOptions);

  return (
    <div>
      {showHeader ? (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-900 dark:text-white">{t('models.pricing')}</span>
          <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {pricing.badgeLabel}
          </span>
        </div>
      ) : null}

      {(regions.length >= 2 || saleGroups.length >= 2 || hasSaleGroups) ? (
        <div className="space-y-1.5 mb-2">
          {regions.length >= 2 ? (
            <div className="flex items-center gap-1" role="tablist" aria-label={t('models.region', 'Region')}>
              {regions.map((region) => {
                const active = region.regionCode === activeRegion;
                return (
                  <button
                    key={region.regionCode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(event) => {
                      event.stopPropagation();
                      setRegionCode(region.regionCode);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider transition-colors ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {t(region.labelKey, region.fallbackLabel)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {saleGroups.length >= 2 ? (
            <div className="flex items-center gap-1" role="tablist" aria-label={t('models.group', 'Group')}>
              {saleGroups.map((group) => {
                const active = group === activeGroup;
                return (
                  <button
                    key={group}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPriceType('sale');
                      setSelectedGroup(group);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {t(modelCatalogGroupLabelKey(group), modelCatalogGroupFallbackLabel(group))}
                    <GroupSaleMultiplierBadge
                      multiplier={groupSaleMultipliers?.get(group) ?? ''}
                      title={t('models.group.saleMultiplier', 'Sale multiplier')}
                    />
                  </button>
                );
              })}
            </div>
          ) : null}

          {hasSaleGroups ? (
            <div className="flex items-center gap-1" role="tablist" aria-label={t('models.priceType', 'Price type')}>
              {PRICE_TYPES.map((type) => {
                const active = priceType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPriceType(type);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      active
                        ? 'bg-lobster-500 text-white dark:bg-lobster-500 dark:text-white'
                        : 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {t(
                      type === 'sale' ? 'models.priceType.sale' : 'models.priceType.standard',
                      type === 'sale' ? 'Sale' : 'Standard',
                    )}
                    {type === 'sale' ? (
                      <GroupSaleMultiplierBadge
                        multiplier={saleMultiplier ?? ''}
                        title={`${t('models.group.saleMultiplier', 'Sale multiplier')}: ${t(
                          modelCatalogGroupLabelKey(activeGroup),
                          modelCatalogGroupFallbackLabel(activeGroup),
                        )}`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {pricing.cells.map(cell => (
          <div key={cell.key} className={pricingCellContainerClassName(cell, pricing.layout)}>
            <div className={pricingCellLabelClassName(cell, pricing.layout)}>{t(cell.labelKey)}</div>
            <div className={pricingCellValueClassName(cell, pricing.layout)}>{cell.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function pricingCellContainerClassName(cell: ModelCatalogPricingCell, layout: 'token' | 'flat'): string {
  if (layout === 'flat') {
    return 'col-span-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg p-3 border border-slate-100 dark:border-white/5 flex items-center justify-between';
  }
  if (cell.tone === 'cached') {
    return 'bg-blue-50/50 dark:bg-blue-500/5 rounded-lg p-2 border border-blue-100 dark:border-blue-500/10';
  }
  if (cell.unavailable) {
    return 'bg-slate-50 dark:bg-white/[0.02] rounded-lg p-2 border border-slate-100 dark:border-white/5 opacity-50';
  }
  return 'bg-slate-50 dark:bg-white/[0.02] rounded-lg p-2 border border-slate-100 dark:border-white/5';
}

function pricingCellLabelClassName(cell: ModelCatalogPricingCell, layout: 'token' | 'flat'): string {
  if (layout === 'flat') {
    return 'text-xs text-slate-500 uppercase tracking-wider font-medium';
  }
  if (cell.tone === 'cached') {
    return 'text-[10px] text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider truncate';
  }
  return 'text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider truncate';
}

function pricingCellValueClassName(cell: ModelCatalogPricingCell, layout: 'token' | 'flat'): string {
  if (layout === 'flat') {
    return 'text-sm font-mono text-slate-900 dark:text-white font-semibold';
  }
  if (cell.tone === 'cached') {
    return 'text-xs font-mono text-blue-700 dark:text-blue-300';
  }
  if (cell.unavailable) {
    return 'text-xs font-mono text-slate-400';
  }
  return 'text-xs font-mono text-slate-700 dark:text-slate-300';
}