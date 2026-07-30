import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, Database, Zap, ArrowUpRight, LayoutGrid, List, ChevronDown, Tag, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Model, ModelGroupKey } from '../data/models';
import {
  MODEL_CATEGORIES,
  createDefaultModelCatalogFilters,
  deriveModelCatalogCardView,
  deriveModelCatalogFilterOptions,
  deriveModelCatalogPricingView,
  filterModelsForCatalog,
  filterProvidersForCatalog,
  modelCatalogCategoryLabelKey,
  modelCatalogGroupLabelKey,
  resetModelCatalogFilters,
  resolveDisplayedProvidersForCatalog,
  resolveProviderShowMoreStateForCatalog,
  type ModelCatalogFilters,
  type ModelCatalogPricingCell,
} from '../modelCatalog';
import {
  ModelService,
  type ModelCatalogGroup,
  type ModelCatalogProvider,
} from '../modelService';
import { FilterSidebar, CollapsibleSection, FilterCheckbox, BottomPagination } from '@sdkwork/clawroutes-pc-commons';

import { ModalityIcon } from '../components/ModalityIcon';

const MODEL_CATALOG_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];
const DEFAULT_MODEL_CATALOG_UI_PAGE_SIZE = 20;


export function Models() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ModelCatalogFilters>(() => createDefaultModelCatalogFilters());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [catalogModels, setCatalogModels] = useState<Model[]>([]);
  const [catalogGroups, setCatalogGroups] = useState<ModelCatalogGroup[]>([]);
  const [catalogProviders, setCatalogProviders] = useState<ModelCatalogProvider[]>([]);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(DEFAULT_MODEL_CATALOG_UI_PAGE_SIZE);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const updateFilters = (updates: Partial<ModelCatalogFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const toggleStringFilter = (
    key: 'selectedProviders' | 'selectedModalities' | 'selectedCapabilities' | 'selectedCategories',
    value: string,
  ) => {
    setFilters(prev => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter(item => item !== value) : [...current, value],
      };
    });
  };

  const toggleGroupFilter = (value: ModelGroupKey) => {
    setFilters(prev => ({
      ...prev,
      selectedGroups: prev.selectedGroups.includes(value)
        ? prev.selectedGroups.filter(item => item !== value)
        : [...prev.selectedGroups, value],
    }));
  };

  const clearFilters = () => {
    setFilters(resetModelCatalogFilters);
  };

  const filterOptions = useMemo(() => {
    return deriveModelCatalogFilterOptions(
      catalogModels,
      catalogGroups,
      catalogProviders.map((provider) => provider.label),
    );
  }, [catalogGroups, catalogModels, catalogProviders]);

  const filteredProviders = useMemo(() => {
    return filterProvidersForCatalog(filterOptions.providers, filters.providerSearchQuery);
  }, [filterOptions.providers, filters.providerSearchQuery]);

  const displayedProviders = resolveDisplayedProvidersForCatalog(filteredProviders, {
    providerSearchQuery: filters.providerSearchQuery,
    showAllProviders,
  });
  const providerShowMoreState = resolveProviderShowMoreStateForCatalog(filteredProviders, {
    providerSearchQuery: filters.providerSearchQuery,
    showAllProviders,
  });
  const selectedProviderCodes = useMemo(() => {
    if (filters.selectedProviders.length === 0) {
      return [];
    }
    return resolveSelectedProviderCodes(catalogModels, catalogProviders, filters.selectedProviders);
  }, [catalogModels, catalogProviders, filters.selectedProviders]);
  const selectedProviderCodesKey = selectedProviderCodes.join(',');
  const selectedModalitiesKey = filters.selectedModalities.join(',');
  const selectedCapabilitiesKey = filters.selectedCapabilities.join(',');
  const selectedCategoriesKey = filters.selectedCategories.join(',');
  const selectedGroupsKey = filters.selectedGroups.join(',');

  useEffect(() => {
    setCatalogPage(1);
  }, [
    filters.searchQuery,
    selectedProviderCodesKey,
    selectedModalitiesKey,
    selectedCapabilitiesKey,
    selectedCategoriesKey,
    selectedGroupsKey,
    catalogPageSize,
  ]);

  useEffect(() => {
    let cancelled = false;
    setProviderLoadError(null);

    ModelService.fetchModelProviders()
      .then((providers) => {
        if (!cancelled) {
          setCatalogProviders(providers);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProviderLoadError(
            error instanceof Error ? error.message : t('models.loadError', 'Failed to load models'),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoadError(null);
    setCatalogLoading(true);

    ModelService.fetchModelCatalog({
      vendorCodes: selectedProviderCodes,
      modalities: filters.selectedModalities,
      capabilities: filters.selectedCapabilities,
      categories: filters.selectedCategories,
      groups: filters.selectedGroups,
      searchQuery: filters.searchQuery,
      page: catalogPage,
      pageSize: catalogPageSize,
    })
      .then((catalog) => {
        if (!cancelled) {
          setCatalogModels(catalog.models);
          setCatalogGroups(catalog.groups);
          setCatalogTotal(catalog.pageInfo.total);
          setCatalogHasMore(catalog.pageInfo.hasMore);
          setCatalogLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogModels([]);
          setCatalogGroups([]);
          setCatalogTotal(0);
          setCatalogHasMore(false);
          setCatalogLoadError(error instanceof Error ? error.message : t('models.loadError', 'Failed to load models'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    filters.searchQuery,
    selectedProviderCodesKey,
    selectedModalitiesKey,
    selectedCapabilitiesKey,
    selectedCategoriesKey,
    selectedGroupsKey,
    catalogPage,
    catalogPageSize,
    selectedProviderCodes,
    filters.selectedModalities,
    filters.selectedCapabilities,
    filters.selectedCategories,
    filters.selectedGroups,
    t,
  ]);

  const filteredModels = useMemo(() => {
    return filterModelsForCatalog(catalogModels, filters, selectedProviderCodes);
  }, [catalogModels, filters, selectedProviderCodes]);

  return (
    <div className="pt-24 pb-24 w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8 min-h-screen">

      {/* Sidebar Filters */}
      <FilterSidebar>
        <CollapsibleSection title={t('models.categories', 'Categories')} icon={Tag}>
          <div className="space-y-2">
            {MODEL_CATEGORIES.map(category => (
              <FilterCheckbox
                key={category}
                checked={filters.selectedCategories.includes(category)}
                label={t(modelCatalogCategoryLabelKey(category), category)}
                onClick={() => toggleStringFilter('selectedCategories', category)}
                activeColorClass="bg-blue-500 border-blue-500"
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t('models.groups', 'Groups')} icon={Users}>
          <div className="space-y-2">
            {filterOptions.groups.map(group => (
              <FilterCheckbox
                key={group.key}
                checked={filters.selectedGroups.includes(group.key)}
                label={t(modelCatalogGroupLabelKey(group.key), group.label)}
                onClick={() => toggleGroupFilter(group.key)}
                activeColorClass="bg-purple-500 border-purple-500"
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t('models.modality')} icon={SlidersHorizontal}>
          <div className="space-y-2">
            {filterOptions.modalities.map(modality => (
              <FilterCheckbox
                key={modality}
                checked={filters.selectedModalities.includes(modality)}
                label={modality}
                onClick={() => toggleStringFilter('selectedModalities', modality)}
                icon={<ModalityIcon modality={modality} className="w-3.5 h-3.5 text-slate-500" />}
                activeColorClass="bg-lobster-500 border-lobster-500"
              />
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t('models.provider')} icon={Database}>
          <div className="relative mb-3 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder={t('models.providerSearch')}
              value={filters.providerSearchQuery}
              onChange={(e) => updateFilters({ providerSearchQuery: e.target.value })}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>
          <div className="space-y-2 pr-2">
            {displayedProviders.map(provider => (
              <FilterCheckbox
                key={provider}
                checked={filters.selectedProviders.includes(provider)}
                label={provider}
                onClick={() => toggleStringFilter('selectedProviders', provider)}
                activeColorClass="bg-orange-500 border-orange-500"
              />
            ))}
            {filteredProviders.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-2">
                {t('models.noResults')}
              </div>
            )}
          </div>
          {providerShowMoreState.visible && (
            <button
              onClick={() => setShowAllProviders(!showAllProviders)}
              className="mt-3 text-xs font-medium text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              {t(providerShowMoreState.labelKey, {
                count: providerShowMoreState.hiddenCount,
                defaultValue: providerShowMoreState.fallbackLabel,
              })}
              <ChevronDown className={`w-3 h-3 transition-transform ${providerShowMoreState.expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </CollapsibleSection>

        <CollapsibleSection title={t('models.capabilities')} icon={Zap}>
          <div className="space-y-2">
            {filterOptions.capabilities.map(capability => (
              <FilterCheckbox
                key={capability}
                checked={filters.selectedCapabilities.includes(capability)}
                label={capability}
                onClick={() => toggleStringFilter('selectedCapabilities', capability)}
                activeColorClass="bg-amber-500 border-amber-500"
              />
            ))}
          </div>
        </CollapsibleSection>
      </FilterSidebar>

      {/* Main Content */}
      <main className="flex-1">
        {catalogLoadError || providerLoadError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
            {catalogLoadError || providerLoadError}
          </div>
        ) : null}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="relative w-full sm:w-72 lg:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-lobster-500 transition-colors" />
            <input
              type="text"
              placeholder={t('models.search')}
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              className="w-full bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex bg-slate-100 dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/5 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#1a1a1a] text-lobster-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title={t('models.viewGrid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#1a1a1a] text-lobster-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title={t('models.viewList')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500 shadow-sm cursor-pointer transition-all hover:border-slate-300 dark:hover:border-white/20"
            >
              <option value="Popularity">{t('models.sort.popularity')}</option>
              <option value="Price: Low to High">{t('models.sort.priceLowToHigh')}</option>
              <option value="Price: High to Low">{t('models.sort.priceHighToLow')}</option>
              <option value="Context Length">{t('models.sort.contextLength')}</option>
            </select>
          </div>
        </div>

        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-4"}>
          {filteredModels.map((model, index) => {
            const card = deriveModelCatalogCardView(model);
            const pricing = deriveModelCatalogPricingView(model);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => navigate(card.detailPath)}
                className={`group p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer flex shadow-sm hover:shadow-md ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row sm:items-center gap-6'}`}
              >
                <div className={viewMode === 'grid' ? "mb-3" : "flex-1 min-w-0"}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">{card.provider}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <ModalityIcon modality={card.modality} className="w-3 h-3" />
                      {card.modality}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-lobster-500 transition-colors flex items-center gap-2 truncate">
                    {card.name}
                    <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all flex-shrink-0" />
                  </h3>
                  <p className={`text-sm text-slate-600 dark:text-slate-400 ${viewMode === 'grid' ? 'mt-2 line-clamp-2' : 'mt-1 truncate'}`}>
                    {t(card.descriptionLabelKey, card.description)}
                  </p>
                  {viewMode === 'list' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {card.capabilities.map(capability => (
                        <span key={capability.label} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                          {t(capability.labelKey, capability.label)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {viewMode === 'grid' && (
                  <div className="flex flex-wrap gap-2 mb-6 mt-2">
                    {card.capabilities.map(capability => (
                      <span key={capability.label} className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                        {t(capability.labelKey, capability.label)}
                      </span>
                    ))}
                  </div>
                )}

                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${viewMode === 'grid' ? 'pt-4 border-t border-slate-200 dark:border-white/5 mt-auto' : 'sm:w-[480px] flex-shrink-0'}`}>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{t('models.context')}</div>
                    <div className="text-sm font-mono text-slate-700 dark:text-slate-300">{card.context}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{t('models.latency')}</div>
                    <div className="text-sm font-mono text-emerald-600 dark:text-emerald-400">{card.latency}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">{t('models.throughput')}</div>
                    <div className="text-sm font-mono text-blue-600 dark:text-blue-400">{card.throughput}</div>
                  </div>

                <div className="col-span-2 sm:col-span-3 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{t('models.pricing')}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">{pricing.badgeLabel}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {pricing.cells.map(cell => (
                      <div key={cell.key} className={pricingCellContainerClassName(cell, pricing.layout)}>
                        <div className={pricingCellLabelClassName(cell, pricing.layout)}>{t(cell.labelKey)}</div>
                        <div className={pricingCellValueClassName(cell, pricing.layout)}>{cell.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </motion.div>
            );
          })}

          {filteredModels.length === 0 && (
            <div className="col-span-full py-24 text-center flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-white/10 border-dashed">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('models.noResults')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-6">
                {t('models.noResultsDesc')}
              </p>
              <button
                onClick={clearFilters}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
              >
                {t('models.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {catalogTotal > 0 && (
          <BottomPagination
            className="mt-6 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]"
            page={catalogPage}
            pageSize={catalogPageSize}
            itemCount={filteredModels.length}
            hasNextPage={catalogHasMore}
            disabled={catalogLoading}
            showingLabel={t('models.pagination.showing', 'Showing')}
            pageLabel={t('models.pagination.page', {
              page: catalogPage,
              totalPages: Math.max(1, Math.ceil(catalogTotal / catalogPageSize)),
              defaultValue: `Page ${catalogPage} / ${Math.max(1, Math.ceil(catalogTotal / catalogPageSize))}`,
            })}
            pageSizeLabel={t('models.pagination.pageSize', 'Page size')}
            previousLabel={t('common.actions.previousPage', 'Previous page')}
            nextLabel={t('common.actions.nextPage', 'Next page')}
            pageSizeOptions={MODEL_CATALOG_PAGE_SIZE_OPTIONS}
            onPreviousPage={() => setCatalogPage(current => Math.max(1, current - 1))}
            onNextPage={() => setCatalogPage(current => current + 1)}
            onPageSizeChange={(nextPageSize) => {
              setCatalogPageSize(nextPageSize);
              setCatalogPage(1);
            }}
          />
        )}
      </main>
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

function resolveSelectedProviderCodes(
  models: Model[],
  catalogProviders: ModelCatalogProvider[],
  providers: string[],
): string[] {
  const providerCodesByDisplayName = new Map<string, string>();
  for (const model of models) {
    providerCodesByDisplayName.set(model.provider, model.vendorCode);
  }
  for (const provider of catalogProviders) {
    providerCodesByDisplayName.set(provider.label, provider.code);
  }
  return providers
    .map((provider) => providerCodesByDisplayName.get(provider))
    .filter((code): code is string => code !== undefined);
}
