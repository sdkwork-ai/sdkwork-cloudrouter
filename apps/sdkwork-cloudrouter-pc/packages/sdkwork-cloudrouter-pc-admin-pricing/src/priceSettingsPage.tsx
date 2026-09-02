import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Edit3, Globe2, Plus, Star, Trash2, X } from 'lucide-react';
import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import {
  pricingService,
  type AdminOfficialPricingProductCatalog,
  type AdminOfficialPricingProductItem,
  type AdminOfficialPricingRateItem,
  type AdminPricingPlanItem,
  type AdminPricingCondition,
  type AdminPricingRuleItem,
  type AdminPricingRuleMutationInput,
  type AdminPricingSchedule,
  type AdminPricingScheduleWindow,
  type AdminPricingStatus,
  type AdminDefaultRegionItem,
  type AdminPriceSettingUpsertInput,
} from './pricingService';
import {
  buildPriceSettingProductRows,
  formatPriceSettingVariantTabLabel,
  formatPricingMeterLabel,
  formatPricingMoney,
  formatPricingOperationLabel,
  formatPricingUnitLabel,
  formatPricingQuantity,
  formatOfficialRateScheduleLines,
  groupPriceSettingRatesByRegion,
  groupPriceSettingRatesByVariant,
  normalizePricingDecimal,
  officialRateVariantLabel,
  officialRateUnit,
  pickDefaultPriceSettingRegion,
  pricingRuleLifecycle,
  type PriceSettingProductRow,
  type PriceSettingRegionGroup,
} from './priceSettingModel';
import {
  AdminListToolbar,
  AdminPageShell,
  AdminTableArea,
  errorMessageI18n,
  Field,
  InlineError,
  inputClass,
  primaryButtonClass,
  SearchBox,
  secondaryButtonClass,
  selectClass,
  toolbarSelectClass,
  SidePanel,
  StatusBadge,
  TableState,
} from './components';
import { DefaultRegionManager, type DefaultRegionOption } from './defaultRegionManager';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];
export const PRICE_SETTING_RESOURCE_TYPES = ['all', 'llm', 'image', 'video', 'audio', 'music', 'embedding', 'sound', 'api', 'other'] as const;
type PriceSettingResourceType = (typeof PRICE_SETTING_RESOURCE_TYPES)[number];
const STATUSES: AdminPricingStatus[] = ['active', 'inactive'];
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;
type PriceSettingMode = 'standard' | 'time_window';

const DEFAULT_WINDOW: AdminPricingScheduleWindow = {
  windowCode: 'business-hours',
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '12:00',
  endDayOffset: 0,
};

export interface PriceSettingMeterForm {
  key: string;
  rateCode?: string;
  ruleId?: string;
  ruleCode?: string;
  meterCode: string;
  operationCode: string;
  unitCode: string;
  unitSize: string;
  official?: AdminOfficialPricingRateItem;
  customerPrice: string;
  existingFormulaMode?: AdminPricingRuleItem['formulaMode'];
  existingMultiplier?: string;
  existingMarkupAmount?: string;
  conditions?: AdminPricingCondition[];
}

export interface PriceSettingMutation {
  action: 'upsert' | 'delete';
  id?: string;
  /** Official rate code anchoring the edited meter; present when the mutation
   * targets a catalog-backed meter and can go through the atomic upsert. */
  rateCode?: string;
  input?: AdminPricingRuleMutationInput;
}

/**
 * One region group of the price editor. Every resource is a single admin row,
 * and its prices exist per region — so the drawer edits one section per
 * region, each with its own lifecycle policy (plan, priority, status,
 * effective window, time-window schedule) and its own meter list. Regions the
 * resource does not price yet can be added as new, empty groups.
 */
export interface PriceSettingRegionForm {
  /** Stable identity for React keys and the active-group selector. */
  key: string;
  regionCode: string;
  /** Existing groups seeded from real prices keep their region fixed; only
   * custom groups (brand-new resource pricing) accept a typed region. */
  regionLocked: boolean;
  /** Display only: the currency the official prices of this region use. */
  currencyCode: string;
  pricingPlanId: string;
  meters: PriceSettingMeterForm[];
  removedRuleIds: string[];
  priceMode: PriceSettingMode;
  timeZone: string;
  weeklyWindows: AdminPricingScheduleWindow[];
  includeDates: string;
  excludeDates: string;
  priority: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: AdminPricingStatus;
  /** True when the region's existing rules carry conflicting lifecycle
   * metadata; saving then overwrites all of them with this group's policy. */
  metadataConflict: boolean;
  acknowledgeMetadataConflict: boolean;
}

export interface PriceSettingFormState {
  catalogKey: string;
  vendorCode: string;
  productCode: string;
  resourceCode: string;
  resourceDisplayName: string;
  providerCode: string;
  resourceType: Exclude<PriceSettingResourceType, 'all'>;
  regionGroups: PriceSettingRegionForm[];
  activeRegionKey: string;
}

function emptyMeter(key = 'meter-1'): PriceSettingMeterForm {
  return { key, meterCode: '', operationCode: '', unitCode: 'unit', unitSize: '1', customerPrice: '' };
}

let regionGroupSequence = 0;

function nextRegionGroupKey(regionCode: string): string {
  regionGroupSequence += 1;
  return `${regionCode || 'region'}-${regionGroupSequence}`;
}

/** An empty region group: used for brand-new custom pricing and for regions
 * added to an existing resource that do not price anything yet. */
export function emptyRegionGroupForm(
  regionCode: string,
  options: { pricingPlanId?: string; regionLocked?: boolean; currencyCode?: string } = {},
): PriceSettingRegionForm {
  return {
    key: nextRegionGroupKey(regionCode),
    regionCode,
    regionLocked: options.regionLocked ?? false,
    currencyCode: options.currencyCode ?? '',
    pricingPlanId: options.pricingPlanId ?? '',
    meters: [emptyMeter()],
    removedRuleIds: [],
    priceMode: 'standard',
    timeZone: 'Asia/Shanghai',
    weeklyWindows: [{ ...DEFAULT_WINDOW }],
    includeDates: '',
    excludeDates: '',
    priority: '100',
    effectiveFrom: '',
    effectiveTo: '',
    status: 'active',
    metadataConflict: false,
    acknowledgeMetadataConflict: false,
  };
}

/**
 * Seed one region group per priced region of a resource row. Each group keeps
 * the lifecycle metadata of that region's existing rules (plan, priority,
 * schedule, ...), so regions stay individually configured instead of being
 * flattened onto one shared policy.
 */
export function regionGroupFormsFromPrices(
  prices: readonly { official: AdminOfficialPricingRateItem; rule?: AdminPricingRuleItem }[],
  fallbackPlanId: string,
): PriceSettingRegionForm[] {
  return groupPriceSettingRatesByRegion(prices).map((group) => {
    const groupRules = group.prices
      .map((item) => item.rule)
      .filter((rule): rule is AdminPricingRuleItem => Boolean(rule));
    const firstRule = groupRules[0];
    const firstSchedule = firstRule?.schedule;
    return {
      key: nextRegionGroupKey(group.regionCode),
      regionCode: group.regionCode,
      regionLocked: true,
      currencyCode: group.currencyCode,
      pricingPlanId: firstRule?.pricingPlanId || fallbackPlanId,
      meters: group.prices.map(({ official, rule }) => ({
        key: official.rateCode,
        rateCode: official.rateCode,
        ruleId: rule?.id,
        ruleCode: rule?.ruleCode,
        meterCode: official.meterCode,
        operationCode: official.operationCode,
        unitCode: official.unitCode,
        unitSize: formatPricingQuantity(official.unitSize, official.unitSize),
        official,
        customerPrice: normalizePricingDecimal(rule?.unitPriceOverride),
        existingFormulaMode: rule?.formulaMode,
        existingMultiplier: normalizePricingDecimal(rule?.multiplier) || rule?.multiplier,
        existingMarkupAmount: normalizePricingDecimal(rule?.markupAmount) || rule?.markupAmount,
        conditions: rule?.conditions ?? [],
      })),
      removedRuleIds: [],
      priceMode: firstSchedule ? 'time_window' as const : 'standard' as const,
      timeZone: firstSchedule?.timeZone ?? 'Asia/Shanghai',
      weeklyWindows: firstSchedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] }))
        ?? [{ ...DEFAULT_WINDOW }],
      includeDates: firstSchedule?.includeDates.join(', ') ?? '',
      excludeDates: firstSchedule?.excludeDates.join(', ') ?? '',
      priority: String(firstRule?.priority ?? 100),
      effectiveFrom: firstRule?.effectiveFrom ?? '',
      effectiveTo: firstRule?.effectiveTo ?? '',
      status: firstRule?.status ?? 'active',
      metadataConflict: hasSharedMetadataConflict(groupRules),
      acknowledgeMetadataConflict: false,
    };
  });
}

const EMPTY_FORM: PriceSettingFormState = {
  catalogKey: '', vendorCode: '', productCode: '', resourceCode: '', resourceDisplayName: '', providerCode: '', resourceType: 'llm',
  regionGroups: [emptyRegionGroupForm('')],
  activeRegionKey: '',
};

export function PriceSettingsAdmin() {
  const { t, i18n } = useTranslation();
  const displayLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const [officialCatalog, setOfficialCatalog] = useState<AdminOfficialPricingProductCatalog | null>(null);
  const [rules, setRules] = useState<AdminPricingRuleItem[]>([]);
  const [plans, setPlans] = useState<AdminPricingPlanItem[]>([]);
  const [pricingPlanId, setPricingPlanId] = useState('');
  const [resourceType, setResourceType] = useState<PriceSettingResourceType>('all');
  const [vendorCodes, setVendorCodes] = useState<string[]>([]);
  const [regionCode, setRegionCode] = useState('');
  const [defaultRegionsOpen, setDefaultRegionsOpen] = useState(false);
  // catalogKey -> defaultRegionCode, loaded once so per-row buttons can show
  // which region is the active default. Mutual exclusion is enforced both
  // client-side (one default per catalogKey) and by the partial unique index
  // uk_pricing_default_region_catalog_key on the pricing_default_region table.
  const [defaultRegionByCatalogKey, setDefaultRegionByCatalogKey] = useState<Map<string, AdminDefaultRegionItem>>(new Map());
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<PriceSettingFormState>(EMPTY_FORM);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError(null);
    try {
      const pricingPlanItems = await pricingService.plans.listAll({ pageSize: 200, status: 'active' });
      const pricingPlans = { items: pricingPlanItems };
      const resolvedPlanId = pricingPlanId || pricingPlans.items[0]?.id || '';
      const [pricingRules, officialPrices] = await Promise.all([
        // Rules are loaded without the server-side keyword filter because the
        // product catalog search also covers display names, vendors, and
        // catalog keys that the admin rule endpoint does not index. Resolve
        // the plan first so the initial load never fetches every plan's rules.
        pricingService.rules.listAll({ pageSize: 200, pricingPlanId: resolvedPlanId || undefined }),
        pricingService.officialProducts.list({ category: resourceType, q: appliedSearch || undefined, vendorCodes: vendorCodes.length > 0 ? vendorCodes : undefined, regionCode: regionCode || undefined, page, pageSize }),
      ]);
      if (sequence !== loadSequence.current) return;
      setRules(pricingRules); setPlans(pricingPlans.items); setOfficialCatalog(officialPrices); setPricingPlanId(resolvedPlanId);
      // Pre-fill the plan of groups the operator has not picked one for yet,
      // so creating a new region group does not start from an empty plan.
      setForm((current) => !resolvedPlanId || current.regionGroups.every((group) => group.pricingPlanId)
        ? current
        : { ...current, regionGroups: current.regionGroups.map((group) => group.pricingPlanId ? group : { ...group, pricingPlanId: resolvedPlanId }) });
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setError(errorMessageI18n(cause, t('admin.pricing.settings.errors.loadFailed'), t));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [appliedSearch, page, pageSize, pricingPlanId, regionCode, resourceType, t, vendorCodes]);

  useEffect(() => { void load(); }, [load]);

  const loadDefaultRegions = useCallback(async () => {
    try {
      const result = await pricingService.defaultRegions.list({ page: 1, pageSize: 200 });
      const map = new Map<string, AdminDefaultRegionItem>();
      for (const item of result.items) {
        const key = item.catalogKey.trim();
        if (key && item.status === 'active' && !map.has(key)) map.set(key, item);
      }
      setDefaultRegionByCatalogKey(map);
    } catch {
      // Non-fatal: the row buttons simply fail to show a default until the
      // next successful load or a subsequent user action.
    }
  }, []);

  useEffect(() => { void loadDefaultRegions(); }, [loadDefaultRegions]);

  const handleSetDefaultRegion = useCallback(async (row: PriceSettingProductRow, regionCode: string) => {
    const catalogKey = row.product.catalogKey?.trim();
    const targetRegion = regionCode.trim();
    if (!catalogKey || !targetRegion) return;
    const previous = defaultRegionByCatalogKey.get(catalogKey);
    if (previous?.defaultRegionCode === targetRegion) return;
    const currencyCode = row.prices
      .filter(({ official }) => official.regionCode.trim() === targetRegion)
      .map(({ official }) => official.currencyCode?.trim())
      .find((code) => code) ?? plans[0]?.currencyCode?.trim() ?? 'CNY';
    const identity = {
      catalogKey,
      vendorCode: row.product.vendorCode,
      providerCode: row.product.providerCode,
      productCode: row.product.productCode,
      resourceCode: row.product.resourceCode,
      currencyCode,
      description: '',
    };
    try {
      // A resource keeps exactly one default, so switch it in place when a row
      // already exists. Deleting first and recreating would leave the resource
      // without a default whenever the create half is rejected.
      const saved = previous?.id
        ? await pricingService.defaultRegions.update(previous.id, {
            ...identity,
            defaultRegionCode: targetRegion,
          })
        : await pricingService.defaultRegions.create({
            ...identity,
            defaultRegionCode: targetRegion,
          });
      if (saved?.catalogKey) { setDefaultRegionByCatalogKey((current) => new Map(current).set(saved.catalogKey, saved)); }
      setError(null);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.pricing.settings.defaultRegion.setFailed'), t));
    }
  }, [defaultRegionByCatalogKey, plans, t]);

  const planRules = useMemo(
    () => pricingPlanId ? rules.filter((rule) => rule.pricingPlanId === pricingPlanId) : [],
    [pricingPlanId, rules],
  );
  const productRows = useMemo(() => buildPriceSettingProductRows(officialCatalog?.items ?? [], planRules), [officialCatalog?.items, planRules]);
  const customRules = useMemo(() => {
    if (page !== 1) return [];
    const normalizedSearch = appliedSearch.trim().toLowerCase();
    return planRules.filter((rule) => !productRows.matchedRuleIds.has(rule.id)).filter(isProductScopedRule)
      .filter((rule) => vendorCodes.length === 0 || vendorCodes.includes(vendorFromCatalogKey(rule.catalogKey) || rule.providerCode || ''))
      .filter((rule) => !regionCode || (rule.regionCode ?? '') === regionCode)
      .filter((rule) => resourceType === 'all' || resourceTypeOf(rule) === resourceType)
      .filter((rule) => !normalizedSearch || [rule.productCode, rule.operationCode, rule.meterCode, rule.ruleCode, rule.catalogKey, rule.providerCode, rule.regionCode].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedSearch)));
  }, [appliedSearch, page, planRules, productRows.matchedRuleIds, regionCode, resourceType, vendorCodes]);
  const counts = useMemo(() => {
    const values = new Map<PriceSettingResourceType, string>(PRICE_SETTING_RESOURCE_TYPES.map((type) => [type, '0']));
    for (const group of officialCatalog?.groups ?? []) if (isPriceSettingResourceType(group.code)) values.set(group.code, group.count);
    if (!officialCatalog?.groups.some((group) => group.code === 'all') && resourceType === 'all' && officialCatalog?.pageInfo.totalItems) values.set('all', officialCatalog.pageInfo.totalItems);
    return values;
  }, [officialCatalog, resourceType]);
  const resourceTabs = useMemo(() => {
    const supported = new Set((officialCatalog?.groups ?? []).map((group) => group.code).filter(isPriceSettingResourceType));
    supported.add(resourceType);
    return PRICE_SETTING_RESOURCE_TYPES.filter((type) => type === 'all' || supported.has(type));
  }, [officialCatalog?.groups, resourceType]);
  const vendorOptions = useMemo(() => {
    const options = new Map((officialCatalog?.vendors ?? []).map((vendor) => [vendor.code, { code: vendor.code, count: formatPricingQuantity(vendor.count, vendor.count) }]));
    for (const code of vendorCodes) if (!options.has(code)) options.set(code, { code, count: '0' });
    return [...options.values()];
  }, [officialCatalog?.vendors, vendorCodes]);
  const summary = useMemo(() => {
    let meters = 0;
    let configured = 0;
    for (const row of productRows.rows) {
      // Count the resource's default region tab only, so multi-region rows
      // are not double-counted in the page summary.
      const regionGroups = groupPriceSettingRatesByRegion(row.prices);
      const region = pickDefaultPriceSettingRegion(
        regionGroups,
        defaultRegionByCatalogKey.get(row.product.catalogKey?.trim() ?? '')?.defaultRegionCode,
        row.product.regionCode,
      );
      const prices = regionGroups.find((group) => group.regionCode === region)?.prices ?? row.prices;
      meters += prices.length;
      configured += prices.filter((item) => pricingRuleLifecycle(item.rule) === 'active').length;
    }
    return { products: productRows.rows.length, meters, configured };
  }, [defaultRegionByCatalogKey, productRows.rows]);
  const hasNextPage = officialCatalog?.pageInfo.hasMore ?? (officialCatalog?.pageInfo.totalPages ? page < officialCatalog.pageInfo.totalPages : false);
  // Region candidates for the default-region management dialog, keyed by
  // catalog key: a default region must be one the *specific resource* prices,
  // and the catalog-wide region facets would offer regions the model has no
  // price in (the backend then rejects the save). All priced regions are
  // listed — `global` included, marked ineligible in the picker — so the
  // operator sees the resource's full region list. Rows not on the current
  // page fall back to the catalog-wide list.
  const regionsByCatalogKey = useMemo(() => {
    const map = new Map<string, DefaultRegionOption[]>();
    for (const row of productRows.rows) {
      const key = row.product.catalogKey?.trim();
      if (!key) continue;
      map.set(
        key,
        groupPriceSettingRatesByRegion(row.prices).map((group) => ({
          code: group.regionCode,
          count: String(group.prices.length),
        })),
      );
    }
    return map;
  }, [productRows.rows]);
  const defaultRegionOptions = useMemo(
    () => (officialCatalog?.regions ?? []).map((region) => ({ code: region.code, count: region.count })),
    [officialCatalog?.regions],
  );

  const openCreate = () => {
    const group = emptyRegionGroupForm('', { pricingPlanId: pricingPlanId || plans[0]?.id || '' });
    setForm({ ...EMPTY_FORM, regionGroups: [group], activeRegionKey: group.key });
    setFormError(null); setCreating(true); setPanelOpen(true);
  };
  // The drawer edits the resource's WHOLE region layout: one group per priced
  // region, each seeded with that region's own rule metadata, plus the ability
  // to add brand-new region groups from the catalog facets.
  const openProductSetting = (row: PriceSettingProductRow) => {
    const regionGroups = regionGroupFormsFromPrices(row.prices, pricingPlanId || plans[0]?.id || '');
    setForm({
      catalogKey: row.product.catalogKey ?? '', vendorCode: row.product.vendorCode, productCode: row.product.productCode, resourceCode: row.product.resourceCode, resourceDisplayName: row.product.resourceDisplayName, providerCode: row.product.providerCode,
      resourceType: resourceTypeOfProduct(row.product),
      regionGroups,
      activeRegionKey: regionGroups[0]?.key ?? '',
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const openCustomSetting = (rule: AdminPricingRuleItem) => {
    const group: PriceSettingRegionForm = {
      ...emptyRegionGroupForm(rule.regionCode ?? '', { pricingPlanId: rule.pricingPlanId }),
      meters: [{ key: `rule:${rule.id}`, ruleId: rule.id, ruleCode: rule.ruleCode, meterCode: rule.meterCode ?? '', operationCode: rule.operationCode ?? '', unitCode: 'unit', unitSize: '1', customerPrice: normalizePricingDecimal(rule.unitPriceOverride), existingFormulaMode: rule.formulaMode, existingMultiplier: normalizePricingDecimal(rule.multiplier) || rule.multiplier, existingMarkupAmount: normalizePricingDecimal(rule.markupAmount) || rule.markupAmount, conditions: rule.conditions }],
      priceMode: rule.schedule ? 'time_window' : 'standard', timeZone: rule.schedule?.timeZone ?? 'Asia/Shanghai', weeklyWindows: rule.schedule?.weeklyWindows.map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek] })) ?? [{ ...DEFAULT_WINDOW }], includeDates: rule.schedule?.includeDates.join(', ') ?? '', excludeDates: rule.schedule?.excludeDates.join(', ') ?? '', priority: String(rule.priority), effectiveFrom: rule.effectiveFrom ?? '', effectiveTo: rule.effectiveTo ?? '', status: rule.status,
    };
    setForm({
      catalogKey: rule.catalogKey ?? '', vendorCode: vendorFromCatalogKey(rule.catalogKey) || rule.providerCode || '', productCode: rule.productCode ?? rule.catalogKey ?? '', resourceCode: resourceFromCatalogKey(rule.catalogKey) || rule.productCode || '', resourceDisplayName: resourceFromCatalogKey(rule.catalogKey) || rule.productCode || '', providerCode: rule.providerCode ?? '',
      resourceType: resourceTypeOf(rule),
      regionGroups: [group],
      activeRegionKey: group.key,
    });
    setFormError(null); setCreating(false); setPanelOpen(true);
  };
  const closePanel = () => { setCreating(false); setFormError(null); setPanelOpen(false); };
  const setField = <K extends keyof PriceSettingFormState>(key: K, value: PriceSettingFormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateGroup = (groupIndex: number, patch: Partial<PriceSettingRegionForm>) => setForm((current) => ({ ...current, regionGroups: current.regionGroups.map((group, index) => index === groupIndex ? { ...group, ...patch } : group) }));
  const updateMeter = (groupIndex: number, meterIndex: number, patch: Partial<PriceSettingMeterForm>) => setForm((current) => ({ ...current, regionGroups: current.regionGroups.map((group, index) => index === groupIndex ? { ...group, meters: group.meters.map((meter, meterIndex2) => meterIndex2 === meterIndex ? { ...meter, ...patch } : meter) } : group) }));
  const addMeter = (groupIndex: number) => setForm((current) => ({ ...current, regionGroups: current.regionGroups.map((group, index) => index === groupIndex ? { ...group, meters: [...group.meters, emptyMeter(`meter-${groupIndex}-${group.meters.length + 1}-${Date.now()}`)] } : group) }));
  const copyMetersFromGroup = (sourceKey: string) => setForm((current) => {
    const source = current.regionGroups.find((group) => group.key === sourceKey);
    if (!source) return current;
    return {
      ...current,
      regionGroups: current.regionGroups.map((group) => group.key === current.activeRegionKey
        ? { ...group, meters: copyPriceSettingMeters(source, group) }
        : group),
    };
  });
  const removeMeter = (groupIndex: number, meterIndex: number) => setForm((current) => {
    const group = current.regionGroups[groupIndex];
    if (!group) return current;
    const meter = group.meters[meterIndex];
    const removedRuleIds = meter?.ruleId && !group.removedRuleIds.includes(meter.ruleId)
      ? [...group.removedRuleIds, meter.ruleId]
      : group.removedRuleIds;
    return { ...current, regionGroups: current.regionGroups.map((item, index) => index === groupIndex ? { ...group, removedRuleIds, meters: group.meters.filter((_, meterIndex2) => meterIndex2 !== meterIndex) } : item) };
  });
  /** Removes a whole region group: new groups are dropped, existing groups
   * queue every rule of the region for deletion so saving the form persists
   * the removal. */
  const removeRegionGroup = (groupIndex: number) => setForm((current) => {
    const group = current.regionGroups[groupIndex];
    if (!group || current.regionGroups.length <= 1) return current;
    const regionGroups = current.regionGroups
      .filter((_, index) => index !== groupIndex)
      .map((item) => !group.regionLocked ? item : {
        ...item,
        removedRuleIds: [...item.removedRuleIds, ...group.meters.flatMap((meter) => meter.ruleId && !item.removedRuleIds.includes(meter.ruleId) ? [meter.ruleId] : [])],
      });
    return { ...current, regionGroups, activeRegionKey: regionGroups[0]?.key ?? '' };
  });
  /** Adds an empty region group from the catalog facet list; the region stays
   * fixed once chosen so the operator sees exactly what will be saved. */
  const addRegionGroup = (regionCode: string) => setForm((current) => {
    const trimmed = regionCode.trim();
    if (!trimmed || current.regionGroups.some((group) => group.regionCode.trim().toLowerCase() === trimmed.toLowerCase())) return current;
    const group = emptyRegionGroupForm(trimmed, { regionLocked: true, pricingPlanId: current.regionGroups[0]?.pricingPlanId ?? '' });
    return { ...current, regionGroups: [...current.regionGroups, group], activeRegionKey: group.key };
  });
  const updateWindow = (groupIndex: number, windowIndex: number, patch: Partial<AdminPricingScheduleWindow>) => setForm((current) => ({ ...current, regionGroups: current.regionGroups.map((group, index) => index === groupIndex ? { ...group, weeklyWindows: group.weeklyWindows.map((window, windowIndex2) => windowIndex2 === windowIndex ? { ...window, ...patch } : window) } : group) }));
  const toggleWindowDay = (groupIndex: number, windowIndex: number, day: number) => {
    const group = form.regionGroups[groupIndex];
    const window = group?.weeklyWindows[windowIndex];
    if (!window) return;
    updateWindow(groupIndex, windowIndex, { daysOfWeek: window.daysOfWeek.includes(day) ? window.daysOfWeek.filter((value) => value !== day) : [...window.daysOfWeek, day].sort((left, right) => left - right) });
  };
  const addWindow = (groupIndex: number) => setForm((current) => ({ ...current, regionGroups: current.regionGroups.map((group, index) => {
    if (index !== groupIndex) return group;
    const existing = new Set(group.weeklyWindows.map((window) => window.windowCode));
    let suffix = group.weeklyWindows.length + 1;
    let windowCode = `window-${suffix}`;
    while (existing.has(windowCode)) { suffix += 1; windowCode = `window-${suffix}`; }
    return { ...group, priceMode: 'time_window' as const, weeklyWindows: [...group.weeklyWindows, { ...DEFAULT_WINDOW, windowCode }] };
  }) }));

  const totalMeterCount = form.regionGroups.reduce((count, group) => count + group.meters.length, 0);
  const activeGroup = form.regionGroups.find((group) => group.key === form.activeRegionKey) ?? form.regionGroups[0];
  const activeGroupIndex = activeGroup ? form.regionGroups.indexOf(activeGroup) : -1;
  // Catalog facet regions the resource does not price yet: candidates for a
  // brand-new region group in the drawer.
  const regionCandidates = (officialCatalog?.regions ?? []).filter((region) => !form.regionGroups.some((group) => group.regionCode.trim().toLowerCase() === region.code.trim().toLowerCase()));
  const activeDefaultRegion = defaultRegionByCatalogKey.get(form.catalogKey.trim());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(null);
    const applied: AppliedPriceSettingMutation[] = [];
    try {
      let confirmedForm = form;
      // Region groups whose existing rules carry conflicting lifecycle metadata
      // are overwritten with the group's policy; require one explicit ack.
      const conflictingRegions = form.regionGroups
        .filter((group) => group.metadataConflict && !group.acknowledgeMetadataConflict)
        .map((group) => group.regionCode || form.regionGroups.indexOf(group).toString());
      if (conflictingRegions.length > 0) {
        const detail = conflictingRegions.join(', ');
        if (!window.confirm(t('admin.pricing.settings.form.metadataConflictConfirm') + ` (${detail})`)) {
          throw new Error(t('admin.pricing.settings.form.metadataConflictRequired'));
        }
        confirmedForm = {
          ...form,
          regionGroups: form.regionGroups.map((group) => group.metadataConflict ? { ...group, acknowledgeMetadataConflict: true } : group),
        };
      }
      const mutations = buildPriceSettingMutations(confirmedForm, t); setBusy(true);
      for (const mutation of mutations) {
        if (mutation.action === 'delete') {
          if (mutation.id) {
            const before = rules.find((rule) => rule.id === mutation.id);
            await pricingService.rules.delete(mutation.id);
            applied.push({ mutation, before });
          }
        } else if (canUseAtomicPriceSettingUpsert(mutation)) {
          // Catalog-backed standard rules go through the atomic per-(resource,
          // region, meter) upsert: one transactional call derives the rule
          // scope server-side, so a partial batch can never leave the rule
          // scope desynchronized from the official catalog row.
          const before = rules.find((rule) => rule.id === mutation.id);
          const after = await pricingService.priceSettings.upsert(toPriceSettingUpsertCommand(mutation));
          applied.push({ mutation, before, afterId: after.id });
        } else if (mutation.id) {
          const before = rules.find((rule) => rule.id === mutation.id);
          const after = await pricingService.rules.update(mutation.id, mutation.input!);
          applied.push({ mutation, before, afterId: after.id });
        } else {
          const after = await pricingService.rules.create(mutation.input!);
          applied.push({ mutation, afterId: after.id });
        }
      }
      closePanel(); await load();
    } catch (cause) {
      const rollbackErrors = await rollbackPriceSettingMutations(applied);
      const baseMessage = errorMessageI18n(cause, t('admin.pricing.settings.errors.saveFailed'), t);
      setFormError(rollbackErrors.length > 0
        ? `${baseMessage} ${t('admin.pricing.settings.errors.partialSave', { count: rollbackErrors.length })}`
        : baseMessage);
      // The individual endpoints are transactional, but the group operation
      // is not. Refresh after both success and failure so the UI reflects the
      // authoritative server state, including any irrecoverable partial save.
      await load();
    } finally { setBusy(false); }
  };

  return <AdminPageShell>
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10"><div><h1 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.title')}</h1><p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.subtitle')}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" className={secondaryButtonClass} onClick={() => setDefaultRegionsOpen(true)}><Globe2 className="h-4 w-4" aria-hidden="true" />{t('admin.pricing.settings.defaultRegion.open', { defaultValue: '默认计费 Region' })}</button><button type="button" className={primaryButtonClass} onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" />{t('admin.pricing.settings.actions.new')}</button></div></div>
    <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 px-5 pt-3 dark:border-white/10" role="tablist" aria-label={t('admin.pricing.settings.tabs.label')}>{resourceTabs.map((type) => <button key={type} type="button" role="tab" aria-selected={resourceType === type} onClick={() => { setResourceType(type); setPage(1); }} className={`whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium transition ${resourceType === type ? 'border-lobster-500 text-lobster-600 dark:text-lobster-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>{resourceTypeLabel(type, t)} <span className="ml-1 text-xs tabular-nums text-slate-400">{counts.get(type) ?? 0}</span></button>)}</div>
    <div className="grid shrink-0 grid-cols-1 border-b border-slate-200 bg-slate-50/70 sm:grid-cols-3 dark:border-white/10 dark:bg-white/[0.03]"><SummaryMetric label={t('admin.pricing.settings.summary.products')} value={String(summary.products)} /><SummaryMetric label={t('admin.pricing.settings.summary.meters')} value={String(summary.meters)} /><SummaryMetric label={t('admin.pricing.settings.summary.configured')} value={`${summary.configured}/${summary.meters || 0}`} /></div>
    <AdminListToolbar filters={<div className="flex min-w-0 flex-wrap items-center gap-2"><SearchBox value={search} onChange={setSearch} onSubmit={(value) => { setAppliedSearch(value); setPage(1); }} placeholder={t('admin.pricing.settings.search.placeholder')} /><VendorMultiSelect vendors={vendorOptions} value={vendorCodes} onChange={(next) => { setVendorCodes(next); setPage(1); }} placeholder={t('admin.pricing.settings.filters.allVendors')} /><select className={toolbarSelectClass} value={pricingPlanId} aria-label={t('admin.pricing.settings.filters.pricingPlan')} onChange={(event) => { setPricingPlanId(event.target.value); setPage(1); }}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName || plan.planCode}</option>)}</select><select className={toolbarSelectClass} value={resourceType} aria-label={t('admin.pricing.settings.filters.resourceType')} onChange={(event) => { setResourceType(event.target.value as PriceSettingResourceType); setPage(1); }}>{resourceTabs.map((type) => <option key={type} value={type}>{resourceTypeLabel(type, t)}</option>)}</select><select className={toolbarSelectClass} value={regionCode} aria-label={t('admin.pricing.settings.filters.region')} onChange={(event) => { setRegionCode(event.target.value); setPage(1); }}><option value="">{t('admin.pricing.settings.filters.allRegions')}</option>{(officialCatalog?.regions ?? []).map((region) => <option key={region.code} value={region.code}>{region.code} ({formatPricingQuantity(region.count)})</option>)}</select></div>} />
    <AdminTableArea footer={<BottomPagination page={page} pageSize={pageSize} itemCount={productRows.rows.length + customRules.length} hasNextPage={hasNextPage} pageLabel={t('admin.pricing.common.pagination.page', { page })} pageSizeLabel={t('admin.pricing.common.pagination.rows')} previousLabel={t('admin.pricing.common.pagination.previous')} nextLabel={t('admin.pricing.common.pagination.next')} showingLabel={t('admin.pricing.common.pagination.showing')} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} onNextPage={() => setPage((current) => current + 1)} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} pageSizeOptions={[20, 50, 100]} />}>
      <table className="w-full min-w-[1440px] table-fixed text-left text-sm"><thead className="sticky top-0 z-10 border-b border-slate-200 bg-white text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900"><tr><th className="w-[15%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceName')}</th><th className="w-[8%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.resourceType')}</th><th className="w-[18%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.pricingObject')}</th><th className="w-[23%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.officialPrice')}</th><th className="w-[21%] px-4 py-3 font-medium">{t('admin.pricing.settings.table.customerPrice')}</th><th className="w-[15%] px-4 py-3 text-right font-medium">{t('admin.pricing.settings.table.actions')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-white/5">{loading || (productRows.rows.length === 0 && customRules.length === 0) ? <TableState loading={loading} empty={t('admin.pricing.settings.empty')} colSpan={6} /> : <>{productRows.rows.map((row) => <ProductPriceTableRow key={row.key} row={row} activeResourceType={resourceType} plans={plans} locale={displayLocale} t={t} onEdit={openProductSetting} defaultRegion={defaultRegionByCatalogKey.get(row.product.catalogKey?.trim() ?? '')} onSetDefault={handleSetDefaultRegion} />)}{customRules.map((rule) => <CustomPriceTableRow key={`rule:${rule.id}`} rule={rule} plans={plans} locale={displayLocale} t={t} onEdit={openCustomSetting} />)}</>}</tbody></table>
    </AdminTableArea>
    <InlineError message={error} />
    {panelOpen ? <SidePanel wide title={t(creating ? 'admin.pricing.settings.form.createTitle' : 'admin.pricing.settings.form.editTitle')} description={t('admin.pricing.settings.form.batchDescription')} onClose={closePanel} footer={<><button type="button" className={secondaryButtonClass} onClick={closePanel} disabled={busy}>{t('admin.pricing.common.form.cancel')}</button><button type="submit" form="price-setting-form" className={primaryButtonClass} disabled={busy}>{t('admin.pricing.settings.form.saveItems', { count: totalMeterCount })}</button></>}>
      <form id="price-setting-form" className="flex flex-col gap-5" onSubmit={handleSubmit}><InlineError message={formError} />
        <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.objectTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.objectHint')}</p></div><span className="rounded-full bg-lobster-50 px-2.5 py-1 text-xs font-medium text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300">{resourceTypeLabel(form.resourceType, t)}</span></div>{form.resourceCode ? <div className="mb-4 border-b border-slate-200 pb-4 dark:border-white/10"><div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('admin.pricing.settings.form.resourceIdentity')}</div><div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{form.resourceDisplayName || form.resourceCode}</div><div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{form.resourceCode}{form.catalogKey && form.catalogKey !== form.resourceCode ? ` · ${form.catalogKey}` : ''}</div></div> : null}<div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.settings.form.vendor')} hint={t('admin.pricing.settings.form.vendorHint')}><input className={inputClass} value={form.vendorCode} onChange={(event) => setField('vendorCode', event.target.value)} placeholder="openai / anthropic" readOnly={Boolean(form.catalogKey)} required /></Field><Field label={t('admin.pricing.settings.form.product')} hint={t('admin.pricing.settings.form.productHint')}><input className={inputClass} value={form.productCode} onChange={(event) => setField('productCode', event.target.value)} placeholder="gpt-4o / image-generation" required /></Field><Field label={t('admin.pricing.settings.form.resourceType')}><select className={selectClass} value={form.resourceType} onChange={(event) => setField('resourceType', event.target.value as PriceSettingFormState['resourceType'])}>{PRICE_SETTING_RESOURCE_TYPES.filter((type) => type !== 'all').map((type) => <option key={type} value={type}>{resourceTypeLabel(type, t)}</option>)}</select></Field><Field label={t('admin.pricing.settings.form.provider')} hint={t('admin.pricing.settings.form.providerHint')}><input className={inputClass} value={form.providerCode} onChange={(event) => setField('providerCode', event.target.value)} placeholder="openrouter / aliyun" /></Field><Field label={t('admin.pricing.settings.form.catalogKey')} hint={t('admin.pricing.settings.form.optional')}><input className={inputClass} value={form.catalogKey} onChange={(event) => setField('catalogKey', event.target.value)} placeholder="vendor/model" /></Field></div></section>
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.regionGroupTitle')}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.regionGroupHint')}</p>
            </div>
            {regionCandidates.length > 0 ? (
              <select
                className={`${selectClass} max-w-56`}
                value=""
                aria-label={t('admin.pricing.settings.form.addRegion')}
                onChange={(event) => { if (event.target.value) addRegionGroup(event.target.value); }}
              >
                <option value="">{t('admin.pricing.settings.form.addRegion')}</option>
                {regionCandidates.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.code} ({formatPricingQuantity(region.count)})
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label={t('admin.pricing.settings.tabs.regions')}>
            {form.regionGroups.map((group, groupIndex) => {
              const selected = group.key === activeGroup?.key;
              const configured = group.meters.some((meter) => meter.ruleId || meter.customerPrice.trim());
              return (
                <button
                  key={group.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={group.metadataConflict ? t('admin.pricing.settings.form.metadataConflictTitle') : undefined}
                  onClick={() => setField('activeRegionKey', group.key)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${selected ? 'border-lobster-600 bg-lobster-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-lobster-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-lobster-500/40'}`}
                >
                  <Globe2 className={`h-3 w-3 shrink-0 ${selected ? 'text-white/90' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="font-mono">{group.regionCode || '—'}</span>
                  {group.currencyCode ? <span className={`tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}>{group.currencyCode}</span> : null}
                  <span className={`rounded-full px-1.5 tabular-nums ${selected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'}`}>{group.meters.length}</span>
                  {!configured ? <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-slate-300 dark:bg-slate-600'}`} title={t('admin.pricing.settings.form.regionNotConfigured')} /> : null}
                  {group.metadataConflict ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title={t('admin.pricing.settings.form.metadataConflictTitle')} /> : null}
                  {form.regionGroups.length > 1 ? (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={t('admin.pricing.settings.form.removeRegion', { region: group.regionCode })}
                      title={t('admin.pricing.settings.form.removeRegion', { region: group.regionCode })}
                      className={`-mr-0.5 rounded p-0.5 transition hover:bg-black/10 dark:hover:bg-white/10 ${selected ? 'text-white/80' : 'text-slate-300 hover:text-red-500 dark:text-slate-600'}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (group.regionLocked && !window.confirm(t('admin.pricing.settings.form.removeRegionConfirm', { region: group.regionCode }))) return;
                        removeRegionGroup(groupIndex);
                      }}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {regionCandidates.length === 0 ? (
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{t('admin.pricing.settings.form.noRegionCandidates')}</p>
          ) : null}
        </section>
        {activeGroup && activeGroupIndex >= 0 ? <>
          <section className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {activeGroup.regionLocked ? (
                  <>
                    <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-xs font-semibold text-white dark:bg-white dark:text-slate-900">{activeGroup.regionCode}</span>
                    {activeGroup.currencyCode ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-400">{activeGroup.currencyCode}</span> : null}
                    {activeDefaultRegion?.defaultRegionCode?.trim().toLowerCase() === activeGroup.regionCode.trim().toLowerCase() ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"><Star className="h-3 w-3 fill-current" aria-hidden="true" />{t('admin.pricing.settings.defaultRegion.isDefault')}</span> : null}
                  </>
                ) : (
                  <Field label={t('admin.pricing.settings.form.region')} hint={t('admin.pricing.settings.form.regionHint')}>
                    <input className={inputClass} value={activeGroup.regionCode} onChange={(event) => updateGroup(activeGroupIndex, { regionCode: event.target.value })} placeholder="global / cn" required />
                  </Field>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{t('admin.pricing.settings.form.regionPolicyHint')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t('admin.pricing.settings.form.pricingPlan')} hint={t('admin.pricing.settings.form.pricingPlanHint')}><select className={selectClass} value={activeGroup.pricingPlanId} onChange={(event) => updateGroup(activeGroupIndex, { pricingPlanId: event.target.value })} required><option value="">{t('admin.pricing.settings.form.pricingPlanPlaceholder')}</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planName} ({plan.planCode})</option>)}</select></Field>
              <Field label={t('admin.pricing.common.form.priority')}><input className={inputClass} value={activeGroup.priority} onChange={(event) => updateGroup(activeGroupIndex, { priority: event.target.value })} inputMode="numeric" /></Field>
              <Field label={t('admin.pricing.common.form.status')}><select className={selectClass} value={activeGroup.status} onChange={(event) => updateGroup(activeGroupIndex, { status: event.target.value as AdminPricingStatus })}>{STATUSES.map((value) => <option key={value} value={value}>{t(`admin.pricing.common.status.${value}`)}</option>)}</select></Field>
            </div>
          </section>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.pricing.settings.form.priceGroupTitle')}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.priceGroupHint')}</p></div><div className="flex flex-wrap items-center gap-2">{form.regionGroups.length > 1 ? <select className={`${toolbarSelectClass} max-w-56`} value="" aria-label={t('admin.pricing.settings.form.copyFromRegion')} onChange={(event) => { if (event.target.value) copyMetersFromGroup(event.target.value); }}>{<option value="">{t('admin.pricing.settings.form.copyFromRegion')}</option>}{form.regionGroups.filter((group) => group.key !== activeGroup.key && group.meters.some((meter) => meter.customerPrice.trim())).map((group) => <option key={group.key} value={group.key}>{t('admin.pricing.settings.form.copyFromRegionOption', { region: group.regionCode || '—' })}</option>)}</select> : null}<button type="button" className={secondaryButtonClass} onClick={() => addMeter(activeGroupIndex)}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addMeter')}</button></div></div>
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/10"><div className="hidden grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid dark:border-white/10 dark:bg-white/[0.04]"><span>{t('admin.pricing.settings.form.meter')}</span><span>{t('admin.pricing.settings.table.officialPrice')}</span><span>{t('admin.pricing.settings.form.customerPrice')}</span><span /></div><div className="divide-y divide-slate-200 dark:divide-white/10">{activeGroup.meters.map((meter, meterIndex) => <MeterFormRow key={meter.key} meter={meter} groupIndex={activeGroupIndex} index={meterIndex} locale={displayLocale} t={t} updateMeter={updateMeter} removeMeter={removeMeter} />)}{activeGroup.meters.length === 0 ? <div className="px-3 py-6 text-center text-xs text-slate-400">{t('admin.pricing.settings.form.regionEmptyMeters')}</div> : null}</div></div>
          </section>
          <details className="rounded-lg border border-slate-200 dark:border-white/10"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white"><span>{t('admin.pricing.settings.form.advancedTitle')}</span><ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" /></summary><div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 dark:border-white/10"><Field label={t('admin.pricing.settings.form.priceMode')} hint={t('admin.pricing.settings.form.priceModeHint')}><div className="grid grid-cols-2 gap-2" role="group" aria-label={t('admin.pricing.settings.form.priceMode')}>{(['standard', 'time_window'] as const).map((mode) => <button key={mode} type="button" className={`rounded-md border px-3 py-2 text-sm font-medium transition ${activeGroup.priceMode === mode ? 'border-lobster-500 bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300' : 'border-slate-200 text-slate-600 hover:border-lobster-300 dark:border-white/10 dark:text-slate-300'}`} onClick={() => { updateGroup(activeGroupIndex, { priceMode: mode }); if (mode === 'time_window' && activeGroup.weeklyWindows.length === 0) updateGroup(activeGroupIndex, { weeklyWindows: [{ ...DEFAULT_WINDOW }] }); }}>{t(`admin.pricing.settings.mode.${mode === 'time_window' ? 'timeWindow' : 'standard'}`)}</button>)}</div></Field>{activeGroup.priceMode === 'time_window' ? <TimeWindowFields group={activeGroup} groupIndex={activeGroupIndex} t={t} updateWindow={updateWindow} toggleWindowDay={toggleWindowDay} addWindow={addWindow} updateGroup={updateGroup} /> : null}<div className="grid gap-4 md:grid-cols-2"><Field label={t('admin.pricing.common.form.effectiveFrom')}><input className={inputClass} value={activeGroup.effectiveFrom} onChange={(event) => updateGroup(activeGroupIndex, { effectiveFrom: event.target.value })} placeholder="2026-08-20T00:00:00Z" /></Field><Field label={t('admin.pricing.common.form.effectiveTo')}><input className={inputClass} value={activeGroup.effectiveTo} onChange={(event) => updateGroup(activeGroupIndex, { effectiveTo: event.target.value })} placeholder="2026-08-20T00:00:00Z" /></Field></div>{activeGroup.metadataConflict ? <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"><span>{t('admin.pricing.settings.form.metadataConflictHint', { region: activeGroup.regionCode })}</span><label className="inline-flex items-center gap-2 font-medium"><input type="checkbox" checked={Boolean(activeGroup.acknowledgeMetadataConflict)} onChange={(event) => updateGroup(activeGroupIndex, { acknowledgeMetadataConflict: event.target.checked })} />{t('admin.pricing.settings.form.metadataConflictAcknowledge')}</label></div> : null}</div></details>
        </> : null}
      </form>
    </SidePanel> : null}
    <DefaultRegionManager
      open={defaultRegionsOpen}
      onClose={() => setDefaultRegionsOpen(false)}
      regionOptions={defaultRegionOptions}
      regionsByCatalogKey={regionsByCatalogKey}
    />
  </AdminPageShell>;
}

interface AppliedPriceSettingMutation {
  mutation: PriceSettingMutation;
  before?: AdminPricingRuleItem;
  afterId?: string;
}

async function rollbackPriceSettingMutations(
  applied: readonly AppliedPriceSettingMutation[],
): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const entry of [...applied].reverse()) {
    try {
      if (entry.mutation.action === 'delete') {
        if (!entry.before) throw new Error('deleted pricing rule snapshot is unavailable');
        await pricingService.rules.create(ruleToMutationInput(entry.before, true));
      } else if (entry.mutation.id) {
        if (!entry.before) throw new Error('updated pricing rule snapshot is unavailable');
        await pricingService.rules.update(entry.mutation.id, ruleToMutationInput(entry.before, false));
      } else if (entry.afterId) {
        await pricingService.rules.delete(entry.afterId);
      }
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function ruleToMutationInput(
  rule: AdminPricingRuleItem,
  includeRuleCode: boolean,
): AdminPricingRuleMutationInput {
  return {
    ...(includeRuleCode ? { ruleCode: rule.ruleCode } : {}),
    pricingPlanId: rule.pricingPlanId,
    productCode: rule.productCode,
    operationCode: rule.operationCode,
    meterCode: rule.meterCode,
    providerCode: rule.providerCode,
    regionCode: rule.regionCode,
    catalogKey: rule.catalogKey,
    formulaMode: rule.formulaMode,
    multiplier: rule.multiplier,
    markupAmount: rule.markupAmount,
    unitPriceOverride: rule.unitPriceOverride,
    conditions: rule.conditions,
    schedule: rule.schedule,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    status: rule.status,
  };
}

function SummaryMetric({ label, value }: { label: string; value: string }) { return <div className="border-b border-slate-200 px-5 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-white/10"><div className="text-xs text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</div></div>; }

function VendorMultiSelect({ vendors, value, onChange, placeholder }: { vendors: { code: string; count: string }[]; value: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 288);
    const left = Math.min(rect.left, Math.max(8, window.innerWidth - width - 8));
    setPanelStyle({ top: rect.bottom + 4, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }
    updatePosition();
    const recompute = () => updatePosition();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggle = (code: string) => onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  const visible = value.slice(0, 2);

  return (
    <div ref={rootRef} className="relative w-52 shrink-0">
      <button
        type="button"
        className={`flex h-9 w-full items-center gap-1.5 rounded-md border px-2.5 text-left text-sm transition ${open ? 'border-lobster-500 ring-2 ring-lobster-500/15' : 'border-slate-300 hover:border-slate-400 dark:border-white/10 dark:hover:border-white/20'} ${value.length > 0 ? 'bg-white text-slate-900 dark:bg-white/5 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {value.length === 0 ? (
            <span className="truncate">{placeholder}</span>
          ) : (
            <>
              {visible.map((code) => (
                <span key={code} className="max-w-[92px] truncate rounded-full bg-lobster-50 px-1.5 py-0.5 text-xs font-medium text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-200">
                  {code}
                </span>
              ))}
              {value.length > visible.length ? (
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">+{value.length - visible.length}</span>
              ) : null}
            </>
          )}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-multiselectable
              className="fixed z-[200] max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#171717]"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              {vendors.length === 0 ? (
                <div className="px-2 py-3 text-xs text-slate-400">{placeholder}</div>
              ) : (
                vendors.map((vendor) => (
                  <label
                    key={vendor.code}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${value.includes(vendor.code) ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-200' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5'}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 accent-lobster-600"
                      checked={value.includes(vendor.code)}
                      onChange={() => toggle(vendor.code)}
                    />
                    <span className="min-w-0 flex-1 truncate">{vendor.code}</span>
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPricingQuantity(vendor.count)}</span>
                  </label>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ProductPriceTableRow({ row, activeResourceType, plans, locale, t, onEdit, defaultRegion, onSetDefault }: { row: PriceSettingProductRow; activeResourceType: PriceSettingResourceType; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (row: PriceSettingProductRow) => void; defaultRegion?: AdminDefaultRegionItem; onSetDefault: (row: PriceSettingProductRow, regionCode: string) => Promise<void> | void }) {
  const resourceType = activeResourceType === 'all' ? resourceTypeOfProduct(row.product) : activeResourceType;
  const translate = pricingConditionTranslate(t);
  // A resource row aggregates every region it prices; the region tabs switch
  // the official reference price and sales price cells below.
  const regionGroups = useMemo(() => groupPriceSettingRatesByRegion(row.prices), [row.prices]);
  const [activeRegion, setActiveRegion] = useState(() => pickDefaultPriceSettingRegion(regionGroups, defaultRegion?.defaultRegionCode, row.product.regionCode));
  useEffect(() => {
    if (!regionGroups.some((group) => group.regionCode === activeRegion)) {
      setActiveRegion(pickDefaultPriceSettingRegion(regionGroups, defaultRegion?.defaultRegionCode, row.product.regionCode));
    }
  }, [activeRegion, defaultRegion?.defaultRegionCode, regionGroups, row.product.regionCode]);
  const activeRegionPrices = regionGroups.find((group) => group.regionCode === activeRegion)?.prices ?? row.prices;
  const variantGroups = useMemo(() => groupPriceSettingRatesByVariant(activeRegionPrices), [activeRegionPrices]);
  const [activeVariant, setActiveVariant] = useState(variantGroups[0]?.key ?? 'standard');
  useEffect(() => {
    if (!variantGroups.some((group) => group.key === activeVariant)) {
      setActiveVariant(variantGroups[0]?.key ?? 'standard');
    }
  }, [activeVariant, variantGroups]);
  const activePrices = variantGroups.find((group) => group.key === activeVariant)?.prices ?? activeRegionPrices;
  const showVariantTabs = variantGroups.length > 1;
  const showRegionTabs = regionGroups.length > 1;
  const activeRegionGroup = regionGroups.find((group) => group.regionCode === activeRegion);
  const catalogKey = row.product.catalogKey?.trim();
  // Every priced partition may be the default billing region (`global`
  // included), so the picker is fed straight from the resource's region
  // groups — the backend validates the chosen region is actually priced.
  const currentDefaultRegionCode = catalogKey ? defaultRegion?.defaultRegionCode?.trim() ?? '' : '';
  const [savingDefault, setSavingDefault] = useState(false);
  const applyDefaultRegion = async (next: string) => {
    if (!next || next === currentDefaultRegionCode) return;
    setSavingDefault(true);
    try {
      await onSetDefault(row, next);
    } finally {
      setSavingDefault(false);
    }
  };
  return (
    <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5">
      <td className="px-4 py-4 text-slate-900 dark:text-white">
        <div className="break-words font-semibold">{row.product.resourceDisplayName || row.product.resourceCode || row.product.productDisplayName}</div>
        <div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{row.product.resourceCode}</div>
        {row.product.catalogKey && row.product.catalogKey !== row.product.resourceCode ? <div className="mt-1 break-all text-[11px] text-slate-400">{row.product.catalogKey}</div> : null}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{resourceTypeLabel(resourceType, t)}</span>
      </td>
      <td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400">
        {showRegionTabs ? (
          <PriceRegionTabs
            groups={regionGroups}
            activeRegion={activeRegion}
            defaultRegionCode={defaultRegion?.defaultRegionCode}
            onChange={setActiveRegion}
            t={t}
            className="mb-2"
          />
        ) : (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {activeRegion}
            {activeRegionGroup?.currencyCode ? <span className="tabular-nums text-slate-400">{activeRegionGroup.currencyCode}</span> : null}
          </div>
        )}
        <div>{t('admin.pricing.settings.scope.vendor')}: {row.product.vendorCode || '—'}</div>
        <div className="mt-1">{t('admin.pricing.settings.scope.provider')}: {row.product.providerCode || '—'}</div>
        <div className="mt-1">{t('admin.pricing.settings.scope.product')}: {row.product.productCode || '—'}</div>
        <div className="mt-2">{t('admin.pricing.settings.table.rateCount', { count: activeRegionPrices.length })}</div>
      </td>
      <td className="px-4 py-4">
        {showVariantTabs ? (
          <PriceVariantTabs
            groups={variantGroups}
            activeKey={activeVariant}
            onChange={setActiveVariant}
            translate={translate}
            t={t}
            className="mb-2"
          />
        ) : null}
        <div className="flex flex-col gap-2">
          {activePrices.map(({ official }) => (
            <OfficialRateLine key={official.rateCode} official={official} locale={locale} t={t} showVariantBadge={!showVariantTabs} />
          ))}
        </div>
      </td>
      <td className="px-4 py-4">
        {showVariantTabs ? (
          <PriceVariantTabs
            groups={variantGroups}
            activeKey={activeVariant}
            onChange={setActiveVariant}
            translate={translate}
            t={t}
            className="mb-2"
          />
        ) : null}
        <div className="flex flex-col gap-2">
          {activePrices.map(({ official, rule }) => (
            <CustomerRateLine key={official.rateCode} official={official} rule={rule} plans={plans} locale={locale} t={t} showVariantBadge={!showVariantTabs} />
          ))}
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex w-full flex-col items-stretch gap-2">
          {regionGroups.length > 1 ? (
            <div
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left transition hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
              title={t('admin.pricing.settings.defaultRegion.setHint', { defaultValue: '为该资源选择默认计费 Region' })}
            >
              <div className="flex items-center gap-1.5">
                <Star className={`h-3.5 w-3.5 shrink-0 ${currentDefaultRegionCode ? 'fill-current text-lobster-500 dark:text-lobster-400' : 'text-slate-400'}`} aria-hidden="true" />
                <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.defaultRegion.isDefaultLabel', { defaultValue: '默认 Region' })}</span>
              </div>
              {/* The picker lists every region the resource prices. Every
                  partition — `global` included — may be the default: the
                  billing engine applies a configured default verbatim, so a
                  global default bills region-less accounts at the global
                  prices instead of the automatic `cn` preference. */}
              <select
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-700 transition focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                value={currentDefaultRegionCode}
                aria-label={t('admin.pricing.settings.defaultRegion.isDefaultLabel', { defaultValue: '默认 Region' })}
                disabled={savingDefault}
                onChange={(event) => { void applyDefaultRegion(event.target.value.trim()); }}
              >
                <option value="">{t('admin.pricing.settings.defaultRegion.selectPlaceholder', { defaultValue: '选择默认 Region' })}</option>
                {regionGroups.map((group) => (
                  <option key={group.regionCode} value={group.regionCode}>
                    {group.regionCode}{group.currencyCode ? ` · ${group.currencyCode}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <SingleDefaultRegionChoice
              region={regionGroups[0]}
              active={currentDefaultRegionCode.toLowerCase() === regionGroups[0].regionCode.trim().toLowerCase()}
              saving={savingDefault}
              onApply={() => applyDefaultRegion(regionGroups[0].regionCode)}
              t={t}
            />
          )}
          <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(row)}>
            <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('admin.pricing.settings.actions.editPrice')}
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * A resource priced in exactly one specific Region has nothing to choose, so
 * instead of a one-option dropdown the region is stated outright with a
 * one-click apply. This mirrors the operator rule that a picker only makes
 * sense when there is more than one candidate.
 */
function SingleDefaultRegionChoice({ region, active, saving, onApply, t }: { region: PriceSettingRegionGroup; active: boolean; saving: boolean; onApply: () => void; t: TranslationFunction }) {
  return (
    <div
      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left dark:border-white/10"
      title={t('admin.pricing.settings.defaultRegion.singleRegionHint', { defaultValue: '该资源仅在此一个 Region 定价，无需选择' })}
    >
      <div className="flex items-center gap-1.5">
        <Star className={`h-3.5 w-3.5 shrink-0 ${active ? 'fill-current text-lobster-500 dark:text-lobster-400' : 'text-slate-400'}`} aria-hidden="true" />
        <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.defaultRegion.isDefaultLabel', { defaultValue: '默认 Region' })}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs font-medium text-slate-700 dark:text-slate-200">
          {region.regionCode}{region.currencyCode ? <span className="ml-1 font-sans text-slate-400">{region.currencyCode}</span> : null}
        </span>
        {active ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            {t('admin.pricing.settings.defaultRegion.active', { defaultValue: '已生效' })}
          </span>
        ) : (
          <button
            type="button"
            className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[11px] font-semibold text-lobster-600 transition hover:bg-lobster-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10"
            disabled={saving}
            onClick={() => onApply()}
          >
            {t('admin.pricing.settings.defaultRegion.setAsDefault', { defaultValue: '设为默认' })}
          </button>
        )}
      </div>
    </div>
  );
}

function PriceRegionTabs({ groups, activeRegion, defaultRegionCode, onChange, t, className = '' }: { groups: ReturnType<typeof groupPriceSettingRatesByRegion>; activeRegion: string; defaultRegionCode?: string; onChange: (regionCode: string) => void; t: TranslationFunction; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()} role="tablist" aria-label={t('admin.pricing.settings.tabs.regions', { defaultValue: '计费 Region' })}>
      {groups.map((group) => {
        const selected = group.regionCode === activeRegion;
        const isDefault = Boolean(defaultRegionCode && defaultRegionCode === group.regionCode);
        return (
          <button
            key={group.regionCode}
            type="button"
            role="tab"
            aria-selected={selected}
            title={isDefault ? t('admin.pricing.settings.defaultRegion.isDefault', { defaultValue: '默认计费 Region' }) : undefined}
            onClick={() => onChange(group.regionCode)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${selected ? 'bg-lobster-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}
          >
            {isDefault ? <Star className="h-3 w-3 fill-current" aria-hidden="true" /> : null}
            {group.regionCode}
            <span className={`tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}>{group.prices.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function PriceVariantTabs({
  groups,
  activeKey,
  onChange,
  translate,
  t,
  className = '',
}: {
  groups: ReturnType<typeof groupPriceSettingRatesByVariant>;
  activeKey: string;
  onChange: (key: string) => void;
  translate: (key: string, fallback?: string) => string;
  t: TranslationFunction;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`.trim()} role="tablist" aria-label={t('admin.pricing.settings.tabs.variants')}>
      {groups.map((group) => {
        const selected = group.key === activeKey;
        const label = formatPriceSettingVariantTabLabel(group.key, translate);
        const scheduleLines = formatOfficialRateScheduleLines(group.prices[0]?.official.schedule, translate);
        return (
          <button
            key={group.key}
            type="button"
            role="tab"
            aria-selected={selected}
            title={scheduleLines.length > 0 ? `${t('admin.pricing.schedule.title')}\n${scheduleLines.join('\n')}` : undefined}
            onClick={() => onChange(group.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${selected ? 'bg-lobster-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'}`}
          >
            {label}
            <span className={`ml-1 tabular-nums ${selected ? 'text-white/80' : 'text-slate-400'}`}>{group.prices.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function OfficialRateLine({ official, locale, t, showVariantBadge = true }: { official: AdminOfficialPricingRateItem; locale: string; t: TranslationFunction; showVariantBadge?: boolean }) {
  const translate = pricingConditionTranslate(t);
  const variantLabel = showVariantBadge ? officialRateVariantLabel(official, translate) : undefined;
  const scheduleLines = formatOfficialRateScheduleLines(official.schedule, translate);
  return (
    <div className="group/rate relative rounded-md border border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-slate-800 dark:text-slate-100">{formatPricingMeterLabel(official, translate)}</span>
            {variantLabel ? (
              <span
                className={`inline-flex cursor-help rounded-full px-1.5 py-0.5 text-[10px] font-medium ${scheduleLines.length > 0 ? 'bg-amber-50 text-amber-700 underline decoration-dotted underline-offset-2 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}
              >
                {variantLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 break-all text-[11px] text-slate-400">
            {formatPricingOperationLabel(official, translate)}
          </div>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <div className="font-semibold text-slate-900 dark:text-white">{formatPricingMoney(official.unitPrice, official.currencyCode, locale)}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(official, translate)}</div>
        </div>
      </div>
      {official.tiers.map((tier) => (
        <div key={tier.tierCode} className="mt-1 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {formatPricingConditionScalarLabel(tier.tierCode, translate)}: {formatPricingMoney(tier.unitPrice, tier.currencyCode, locale)} / {formatPricingQuantity(tier.unitSize)} {formatPricingUnitLabel(official.unitCode, translate)} · {t('admin.pricing.settings.table.flatAmount')} {formatPricingMoney(tier.flatAmount, tier.currencyCode, locale)}
        </div>
      ))}
      {scheduleLines.length > 0 ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
        >
          <div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>
          {scheduleLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type CustomerRateDescriptor = Pick<AdminOfficialPricingRateItem, 'meterCode' | 'meterDisplayName' | 'currencyCode' | 'conditions' | 'rateVariant'>
  & Partial<Pick<AdminOfficialPricingRateItem, 'unitPrice' | 'unitCode' | 'unitSize' | 'schedule'>>;

function CustomerRateLine({ official, rule, plans, locale, t, showVariantBadge = true }: { official: CustomerRateDescriptor; rule?: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; showVariantBadge?: boolean }) {
  const plan = rulesFindPlan(plans, rule);
  const lifecycle = pricingRuleLifecycle(rule);
  const salesPriceConfigured = lifecycle === 'active';
  const hasOfficialPrice = Boolean(official.unitPrice);
  const currency = plan?.currencyCode ?? official.currencyCode;
  const currencyMismatch = Boolean(salesPriceConfigured && rule && plan && official.currencyCode && plan.currencyCode !== official.currencyCode);
  const translate = pricingConditionTranslate(t);
  const variantLabel = showVariantBadge ? officialRateVariantLabel(official, translate) : undefined;
  const scheduleLines = formatOfficialRateScheduleLines(official.schedule ?? rule?.schedule, translate);
  const fallbackLabel = !hasOfficialPrice
    ? t('admin.pricing.settings.table.noOfficialFallback')
    : lifecycle === 'missing'
      ? t('admin.pricing.settings.table.followOfficial')
      : t(`admin.pricing.settings.table.fallback.${lifecycle}`);
  const salesValue = currencyMismatch
    ? t('admin.pricing.settings.table.currencyMismatch')
    : salesPriceConfigured && rule?.formulaMode === 'unit_price_override' && rule.unitPriceOverride
    ? formatPricingMoney(rule.unitPriceOverride, currency, locale)
    : salesPriceConfigured && rule
      ? t('admin.pricing.settings.table.formulaPrice')
      : hasOfficialPrice ? formatPricingMoney(official.unitPrice, official.currencyCode, locale) : '—';
  return (
    <div className={`group/rate relative rounded-md border px-3 py-2 dark:border-white/10 ${currencyMismatch ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' : salesPriceConfigured ? 'border-lobster-200 bg-lobster-50/40 dark:bg-lobster-500/5' : 'border-slate-200/80 bg-slate-50/50 dark:bg-white/[0.02]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
          <span>{formatPricingMeterLabel(official, translate)}</span>
          {variantLabel ? (
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${scheduleLines.length > 0 ? 'cursor-help bg-amber-50 text-amber-700 underline decoration-dotted underline-offset-2 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
              {variantLabel}
            </span>
          ) : null}
        </span>
        {currencyMismatch ? <span className="text-[11px] font-medium text-red-600 dark:text-red-300">{t('admin.pricing.settings.table.currencyMismatch')}</span> : salesPriceConfigured && rule ? <StatusBadge status={rule.status} /> : <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{fallbackLabel}</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={`tabular-nums ${currencyMismatch ? 'font-semibold text-red-700 dark:text-red-200' : salesPriceConfigured ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'}`}>{salesValue}</span>
        {currencyMismatch ? <span className="text-[11px] text-red-500 dark:text-red-300">{official.currencyCode} → {plan?.currencyCode}</span> : salesPriceConfigured && rule ? <span className="text-[11px] text-slate-400">{rule.schedule ? t('admin.pricing.settings.mode.timeWindow') : t('admin.pricing.settings.mode.standard')} · {rule.planCode ?? plan?.planCode ?? rule.pricingPlanId}</span> : hasOfficialPrice ? <span className="text-[11px] text-slate-400">{t('admin.pricing.settings.table.officialFallbackValue', { value: formatPricingMoney(official.unitPrice, official.currencyCode, locale) })}</span> : <span className="text-[11px] text-amber-600 dark:text-amber-300">{t('admin.pricing.settings.table.noOfficialFallback')}</span>}
      </div>
      {scheduleLines.length > 0 ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"
        >
          <div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>
          {scheduleLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function rulesFindPlan(plans: AdminPricingPlanItem[], rule?: AdminPricingRuleItem) {
  return rule ? plans.find((item) => item.id === rule.pricingPlanId) : undefined;
}

function pricingConditionTranslate(t: TranslationFunction): (key: string, fallback?: string) => string {
  return (key, fallback) => {
    const translated = String(t(key, fallback === undefined ? undefined : { defaultValue: fallback }));
    if (translated && translated !== key) return translated;
    return fallback ?? key;
  };
}

const RESOURCE_TYPE_FALLBACKS: Record<PriceSettingResourceType, string> = {
  all: 'All',
  llm: 'Text models',
  image: 'Image models',
  video: 'Video models',
  audio: 'Audio models',
  music: 'Music models',
  embedding: 'Embeddings',
  sound: 'Sound effect models',
  api: 'API calls',
  other: 'Other resources',
};

function resourceTypeLabel(type: string, t: TranslationFunction): string {
  const key = `admin.pricing.settings.resource.${type}`;
  const fallback = RESOURCE_TYPE_FALLBACKS[type as PriceSettingResourceType];
  if (fallback) {
    const translated = String(t(key, { defaultValue: fallback }));
    return translated === key ? fallback : translated;
  }
  return String(t('admin.pricing.settings.resource.unknown', { defaultValue: `Other (${type})`, code: type }))
    .replace(/\{\{\s*code\s*\}\}/g, type);
}

function formatPricingConditionScalarLabel(value: string, translate: (key: string, fallback?: string) => string): string {
  const key = `admin.pricing.condition.value.${value.trim().toLowerCase().replace(/-/g, '_')}`;
  const translated = translate(key, '');
  return translated && translated !== key ? translated : value;
}

function CustomPriceTableRow({ rule, plans, locale, t, onEdit }: { rule: AdminPricingRuleItem; plans: AdminPricingPlanItem[]; locale: string; t: TranslationFunction; onEdit: (rule: AdminPricingRuleItem) => void }) {
  const plan = plans.find((item) => item.id === rule.pricingPlanId);
  const official: CustomerRateDescriptor = { meterCode: rule.meterCode || rule.operationCode || 'default', meterDisplayName: rule.meterCode || rule.operationCode || t('admin.pricing.settings.table.defaultMeter'), currencyCode: plan?.currencyCode ?? 'CNY', conditions: rule.conditions ?? [], schedule: rule.schedule, rateVariant: rule.schedule ? 'time_window' : undefined };
  const resourceType = resourceTypeOf(rule);
  const resourceCode = resourceFromCatalogKey(rule.catalogKey) || rule.productCode || rule.ruleCode;
  return <tr className="align-top hover:bg-slate-50 dark:hover:bg-white/5"><td className="px-4 py-4 text-slate-900 dark:text-white"><div className="break-words font-semibold">{resourceCode}</div><div className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{rule.catalogKey || rule.productCode || rule.ruleCode}</div><div className="mt-2 text-xs text-slate-400">{t('admin.pricing.settings.table.customPrice')}</div></td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">{resourceTypeLabel(resourceType, t)}</span></td><td className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400"><div>{t('admin.pricing.settings.scope.provider')}: {rule.providerCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.region')}: {rule.regionCode || '—'}</div><div className="mt-1">{t('admin.pricing.settings.scope.product')}: {rule.productCode || '—'}</div></td><td className="px-4 py-4 text-sm text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</td><td className="px-4 py-4"><CustomerRateLine official={official} rule={rule} plans={plans} locale={locale} t={t} /></td><td className="px-4 py-4 text-right"><button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold text-lobster-600 transition hover:bg-lobster-50 dark:text-lobster-300 dark:hover:bg-lobster-500/10" onClick={() => onEdit(rule)}><Edit3 className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.common.edit')}</button></td></tr>;
}

function MeterFormRow({ meter, groupIndex, index, locale, t, updateMeter, removeMeter }: { meter: PriceSettingMeterForm; groupIndex: number; index: number; locale: string; t: TranslationFunction; updateMeter: (groupIndex: number, meterIndex: number, patch: Partial<PriceSettingMeterForm>) => void; removeMeter: (groupIndex: number, meterIndex: number) => void }) {
  const formula = meter.existingFormulaMode === 'multiplier_markup';
  const translate = pricingConditionTranslate(t);
  const variantLabel = meter.official ? officialRateVariantLabel(meter.official, translate) : undefined;
  const scheduleLines = meter.official ? formatOfficialRateScheduleLines(meter.official.schedule, translate) : [];
  return <div className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_180px_36px] md:items-start"><div className="grid gap-2"><input className={inputClass} value={meter.meterCode} onChange={(event) => updateMeter(groupIndex, index, { meterCode: event.target.value })} placeholder={t('admin.pricing.settings.form.meterPlaceholder')} required={!meter.operationCode} /><input className={inputClass} value={meter.operationCode} onChange={(event) => updateMeter(groupIndex, index, { operationCode: event.target.value })} placeholder={t('admin.pricing.settings.form.operationPlaceholder')} required={!meter.meterCode} /><div className="text-[11px] text-slate-400">{formatPricingQuantity(meter.unitSize)} {formatPricingUnitLabel(meter.unitCode, translate)}{variantLabel ? ` · ${variantLabel}` : ''}{meter.ruleId ? ` · ${t('admin.pricing.settings.form.existing')}` : ''}</div></div><div className="group/rate relative min-h-9 rounded-md bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">{meter.official ? <><div className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatPricingMoney(meter.official.unitPrice, meter.official.currencyCode, locale)}</div><div className="mt-0.5 text-[11px] text-slate-400">/ {officialRateUnit(meter.official, translate)}{variantLabel ? ` · ${variantLabel}` : ''}</div>{scheduleLines.length > 0 ? <div role="tooltip" className="pointer-events-none absolute left-0 top-full z-40 mt-1 hidden w-max max-w-xs rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-5 text-slate-600 shadow-lg group-hover/rate:block dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-300"><div className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{t('admin.pricing.schedule.title')}</div>{scheduleLines.map((line) => <div key={line}>{line}</div>)}</div> : null}</> : <span className="text-xs text-slate-400">{t('admin.pricing.settings.table.noOfficial')}</span>}</div><div><label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.customerPrice')}</label><input className={inputClass} value={meter.customerPrice} onChange={(event) => updateMeter(groupIndex, index, { customerPrice: event.target.value, existingFormulaMode: event.target.value.trim() ? undefined : meter.existingFormulaMode })} placeholder={formula ? t('admin.pricing.settings.form.formulaPreserved') : t('admin.pricing.settings.form.followOfficialPlaceholder')} inputMode="decimal" /><div className="mt-1 text-[11px] text-slate-400">{formula ? t('admin.pricing.settings.form.formulaPreservedHint', { multiplier: normalizePricingDecimal(meter.existingMultiplier) || '1', markup: normalizePricingDecimal(meter.existingMarkupAmount) || '0' }) : t('admin.pricing.settings.form.followOfficialHint')}</div></div><button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-white" title={t('admin.pricing.settings.form.removeMeter')} aria-label={t('admin.pricing.settings.form.removeMeter')} onClick={() => removeMeter(groupIndex, index)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>;
}

function TimeWindowFields({ group, groupIndex, t, updateWindow, toggleWindowDay, addWindow, updateGroup }: { group: PriceSettingRegionForm; groupIndex: number; t: TranslationFunction; updateWindow: (groupIndex: number, windowIndex: number, patch: Partial<AdminPricingScheduleWindow>) => void; toggleWindowDay: (groupIndex: number, windowIndex: number, day: number) => void; addWindow: (groupIndex: number) => void; updateGroup: (groupIndex: number, patch: Partial<PriceSettingRegionForm>) => void }) {
  return <div className="flex flex-col gap-4 rounded-md bg-slate-50 p-3 dark:bg-white/[0.04]"><Field label={t('admin.pricing.settings.form.timeZone')} hint={t('admin.pricing.settings.form.timeZoneHint')}><input className={inputClass} list="pricing-time-zones" value={group.timeZone} onChange={(event) => updateGroup(groupIndex, { timeZone: event.target.value })} placeholder="Asia/Shanghai" required /><datalist id="pricing-time-zones"><option value="UTC" /><option value="Asia/Shanghai" /><option value="Asia/Tokyo" /><option value="America/Los_Angeles" /><option value="America/New_York" /><option value="Europe/London" /></datalist></Field><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.pricing.settings.form.windows')}</span><button type="button" className={secondaryButtonClass} onClick={() => addWindow(groupIndex)}><Plus className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.pricing.settings.form.addWindow')}</button></div>{group.weeklyWindows.map((window, index) => <div key={index} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900"><div className="grid gap-3 md:grid-cols-[1fr_1fr_36px]"><Field label={t('admin.pricing.settings.form.windowCode')}><input className={inputClass} value={window.windowCode} onChange={(event) => updateWindow(groupIndex, index, { windowCode: event.target.value })} required /></Field><div className="grid grid-cols-2 gap-2"><Field label={t('admin.pricing.settings.form.startTime')}><input type="time" className={inputClass} value={window.startTime} onChange={(event) => updateWindow(groupIndex, index, { startTime: event.target.value })} required /></Field><Field label={t('admin.pricing.settings.form.endTime')}><input type="time" className={inputClass} value={window.endTime} onChange={(event) => updateWindow(groupIndex, index, { endTime: event.target.value })} required /></Field></div><button type="button" className="mt-5 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title={t('admin.pricing.settings.form.removeWindow')} aria-label={t('admin.pricing.settings.form.removeWindow')} disabled={group.weeklyWindows.length <= 1} onClick={() => updateGroup(groupIndex, { weeklyWindows: group.weeklyWindows.filter((_, windowIndex) => windowIndex !== index) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div><div><span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('admin.pricing.settings.form.days')}</span><div className="flex flex-wrap gap-2">{DAY_OPTIONS.map((day, dayIndex) => <label key={day} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.daysOfWeek.includes(day)} onChange={() => toggleWindowDay(groupIndex, index, day)} />{t(`admin.pricing.settings.days.${day}`, { defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex] })}</label>)}</div></div><label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={window.endDayOffset === 1} onChange={(event) => updateWindow(groupIndex, index, { endDayOffset: event.target.checked ? 1 : 0 })} />{t('admin.pricing.settings.form.crossMidnight')}</label></div>)}</div>;
}

function isPriceSettingResourceType(value: string): value is PriceSettingResourceType { return PRICE_SETTING_RESOURCE_TYPES.includes(value as PriceSettingResourceType); }
function resourceTypeOfProduct(item: AdminOfficialPricingProductItem): Exclude<PriceSettingResourceType, 'all'> { return item.groupCodes.find((code: string): code is Exclude<PriceSettingResourceType, 'all'> => code !== 'all' && isPriceSettingResourceType(code)) ?? 'other'; }
function resourceTypeOf(item: Pick<AdminPricingRuleItem, 'productCode' | 'operationCode' | 'meterCode' | 'catalogKey'>): Exclude<PriceSettingResourceType, 'all'> { const value = [item.productCode, item.operationCode, item.meterCode, item.catalogKey].filter(Boolean).join(' ').toLowerCase(); if (value.includes('embedding')) return 'embedding'; if (value.includes('image') || value.includes('vision')) return 'image'; if (value.includes('video')) return 'video'; if (value.includes('music')) return 'music'; if (value.includes('sound') || value.includes('sfx')) return 'sound'; if (value.includes('audio') || value.includes('speech') || value.includes('transcri')) return 'audio'; if (value.includes('api') || value.includes('request') || value.includes('result')) return 'api'; if (value.includes('chat') || value.includes('completion') || value.includes('llm') || value.includes('gpt') || value.includes('claude') || value.includes('gemini') || value.includes('deepseek') || value.includes('qwen') || value.includes('mistral') || value.includes('llama') || value.includes('glm') || value.includes('kimi') || value.includes('ernie') || value.includes('doubao') || value.includes('minimax') || value.includes('grok') || value.includes('command')) return 'llm'; return 'other'; }
function isProductScopedRule(rule: AdminPricingRuleItem): boolean { return Boolean(rule.productCode || rule.catalogKey || rule.operationCode || rule.meterCode || rule.providerCode || rule.regionCode); }
function vendorFromCatalogKey(catalogKey: string | undefined): string { return catalogKey?.split('/')[0]?.trim() ?? ''; }
function resourceFromCatalogKey(catalogKey: string | undefined): string { return catalogKey?.split('/').slice(1).join('/').trim() ?? ''; }

function hasSharedMetadataConflict(rules: readonly AdminPricingRuleItem[]): boolean {
  if (rules.length < 2) return false;
  const first = pricingMetadataSignature(rules[0]);
  return rules.slice(1).some((rule) => pricingMetadataSignature(rule) !== first);
}

function pricingMetadataSignature(rule: AdminPricingRuleItem): string {
  const schedule = rule.schedule
    ? {
      timeZone: rule.schedule.timeZone,
      weeklyWindows: rule.schedule.weeklyWindows
        .map((window) => ({ ...window, daysOfWeek: [...window.daysOfWeek].sort((left, right) => left - right) }))
        .sort((left, right) => left.windowCode.localeCompare(right.windowCode)),
      includeDates: [...rule.schedule.includeDates].sort(),
      excludeDates: [...rule.schedule.excludeDates].sort(),
    }
    : null;
  return JSON.stringify({
    schedule,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom ?? null,
    effectiveTo: rule.effectiveTo ?? null,
    status: rule.status,
  });
}

export function buildPriceSettingMutations(form: PriceSettingFormState, t: TranslationFunction): PriceSettingMutation[] {
  const productCode = form.productCode.trim();
  const vendorCode = form.vendorCode.trim();
  if (!productCode) throw new Error(t('admin.pricing.settings.form.productRequired'));
  if (!vendorCode) throw new Error(t('admin.pricing.settings.form.vendorRequired'));
  if (form.regionGroups.length === 0) throw new Error(t('admin.pricing.settings.form.metersRequired'));
  const now = Date.now();
  const catalogKey = form.catalogKey.trim() || `${vendorCode}/${productCode}`;
  // Each region group validates and mutates independently: a save is a batch
  // of per-region rule upserts/deletes, one rule per meter row.
  const mutations = form.regionGroups.flatMap((group, groupIndex) => {
    if (!group.pricingPlanId.trim()) throw new Error(t('admin.pricing.settings.form.pricingPlanRequired'));
    if (group.meters.length === 0 && group.removedRuleIds.length === 0) {
      // A brand-new group still needs at least one meter to be worth saving.
      if (group.regionLocked) return [];
      throw new Error(t('admin.pricing.settings.form.metersRequired'));
    }
    if (group.metadataConflict && !group.acknowledgeMetadataConflict) {
      throw new Error(t('admin.pricing.settings.form.metadataConflictRequired'));
    }
    const regionCode = group.regionCode.trim();
    if (!regionCode && !group.regionLocked) {
      throw new Error(t('admin.pricing.settings.form.regionRequired'));
    }
    const priority = Number.parseInt(group.priority, 10);
    if (!Number.isInteger(priority) || priority < 0) throw new Error(t('admin.pricing.settings.form.priorityInvalid'));
    const effectiveFrom = parseFormTimestamp(group.effectiveFrom);
    const effectiveTo = parseFormTimestamp(group.effectiveTo);
    if (group.effectiveFrom.trim() && effectiveFrom === undefined) throw new Error(t('admin.pricing.settings.form.datetimeInvalid'));
    if (group.effectiveTo.trim() && effectiveTo === undefined) throw new Error(t('admin.pricing.settings.form.datetimeInvalid'));
    if (effectiveFrom !== undefined && effectiveTo !== undefined && effectiveTo <= effectiveFrom) {
      throw new Error(t('admin.pricing.settings.form.datetimeOrderInvalid'));
    }
    const schedule = buildPriceSchedule(group, t);
    const groupMutations = group.meters.flatMap((meter, index): PriceSettingMutation[] => {
      const meterCode = meter.meterCode.trim();
      const operationCode = meter.operationCode.trim();
      if (!meterCode && !operationCode) throw new Error(t('admin.pricing.settings.form.meterRequired'));
      // Catalog-backed meters carry the official rate they anchor on; the
      // atomic upsert derives the six scope dimensions from that row.
      const anchorRateCode = meter.rateCode?.trim() || meter.official?.rateCode?.trim() || undefined;
      const unitPrice = meter.customerPrice.trim();
      if (!unitPrice) {
        if (!meter.ruleId) return [];
        if (meter.existingFormulaMode === 'multiplier_markup') {
          return [{
            action: 'upsert',
            id: meter.ruleId,
            rateCode: anchorRateCode,
            input: {
              ruleCode: meter.ruleCode,
              pricingPlanId: group.pricingPlanId.trim(),
              productCode,
              operationCode: operationCode || undefined,
              meterCode: meterCode || undefined,
              providerCode: form.providerCode.trim() || undefined,
              regionCode: regionCode || undefined,
              catalogKey,
              formulaMode: 'multiplier_markup',
              multiplier: meter.existingMultiplier || '1',
              markupAmount: meter.existingMarkupAmount || '0',
              schedule,
              priority,
              effectiveFrom: group.effectiveFrom.trim() || undefined,
              effectiveTo: group.effectiveTo.trim() || undefined,
              status: group.status,
              conditions: meter.conditions ?? [],
            },
          }];
        }
        return [{ action: 'delete', id: meter.ruleId }];
      }
      if (!/^[0-9]+(?:\.[0-9]{1,12})?$/.test(unitPrice)) throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
      const normalizedUnitPrice = normalizePricingDecimal(unitPrice);
      if (!normalizedUnitPrice || !/^[0-9]+(?:\.[0-9]{1,12})?$/.test(normalizedUnitPrice)) {
        throw new Error(t('admin.pricing.settings.form.unitPriceRequired'));
      }
      const ruleCode = meter.ruleCode || `${productCode}-${meterCode || operationCode || 'default'}-${now}-${groupIndex}-${index}`.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 96);
      return [{
        action: 'upsert',
        id: meter.ruleId,
        rateCode: anchorRateCode,
        input: {
          ruleCode: meter.ruleId ? meter.ruleCode : ruleCode,
          pricingPlanId: group.pricingPlanId.trim(),
          productCode,
          operationCode: operationCode || undefined,
          meterCode: meterCode || undefined,
          providerCode: form.providerCode.trim() || undefined,
          regionCode: regionCode || undefined,
          catalogKey,
          formulaMode: 'unit_price_override',
          unitPriceOverride: normalizedUnitPrice,
          schedule,
          priority,
          effectiveFrom: group.effectiveFrom.trim() || undefined,
          effectiveTo: group.effectiveTo.trim() || undefined,
          status: group.status,
          conditions: meter.conditions ?? [],
        },
      }];
    });
    const removed = group.removedRuleIds
      .filter((id) => !groupMutations.some((mutation) => mutation.id === id))
      .map((id): PriceSettingMutation => ({ action: 'delete', id }));
    return [...groupMutations, ...removed];
  });
  if (mutations.length === 0) throw new Error(t('admin.pricing.settings.form.salesPriceRequired'));
  return mutations;
}

/** True when a mutation can be saved through the atomic per-(resource, region,
 * meter) upsert instead of the legacy rule endpoints. The atomic path needs a
 * catalog anchor; rules with explicit conditions would be silently stripped
 * (the atomic upsert only writes the unconditioned standard rule), and
 * brand-new time-window rules require a ruleId the client does not have yet,
 * so those keep the legacy create/update path. */
export function canUseAtomicPriceSettingUpsert(mutation: PriceSettingMutation): boolean {
  if (mutation.action !== 'upsert' || !mutation.input || !mutation.rateCode?.trim()) return false;
  if ((mutation.input.conditions ?? []).length > 0) return false;
  if (mutation.input.schedule && !mutation.id) return false;
  return true;
}

/** Converts a legacy rule mutation into the atomic price-setting upsert
 * command. Scope dimensions (product/operation/meter/provider/region/
 * catalogKey) are intentionally NOT sent: the backend derives them from the
 * anchored official rate, which is the whole consistency guarantee. */
export function toPriceSettingUpsertCommand(mutation: PriceSettingMutation): AdminPriceSettingUpsertInput {
  const input = mutation.input;
  if (!input) throw new Error('price setting mutation is missing its rule input');
  if (!mutation.rateCode?.trim()) throw new Error('price setting mutation is missing its official rate anchor');
  return {
    officialRateCode: mutation.rateCode.trim(),
    pricingPlanId: input.pricingPlanId,
    ...(mutation.id ? { ruleId: mutation.id } : {}),
    formulaMode: input.formulaMode,
    ...(input.formulaMode === 'multiplier_markup' ? {
      multiplier: input.multiplier ?? '1',
      markupAmount: input.markupAmount ?? '0',
    } : {
      unitPriceOverride: input.unitPriceOverride ?? '0',
    }),
    ...(input.schedule ? { schedule: input.schedule } : {}),
    priority: String(input.priority),
    ...(input.effectiveFrom?.trim() ? { effectiveFrom: input.effectiveFrom.trim() } : {}),
    ...(input.effectiveTo?.trim() ? { effectiveTo: input.effectiveTo.trim() } : {}),
    status: input.status,
  };
}

/** Copies the priced meters of a source region group into a target group so a
 * resource can be priced across regions without retyping every meter.
 * Meters are matched by (meterCode, operationCode); matched meters only take
 * the source price, appended copies carry no anchor — `rateCode`/`official`
 * point at the source region's catalog rows and must never cross regions, so
 * an appended meter saves as a custom rule for the target region. */
export function copyPriceSettingMeters(
  source: PriceSettingRegionForm,
  target: PriceSettingRegionForm,
): PriceSettingMeterForm[] {
  const priced = source.meters.filter((meter) => meter.customerPrice.trim());
  if (priced.length === 0) return target.meters;
  const nextMeters = [...target.meters];
  let appended = 0;
  for (const meter of priced) {
    const meterCode = meter.meterCode.trim().toLowerCase();
    const operationCode = meter.operationCode.trim().toLowerCase();
    const matchIndex = nextMeters.findIndex((candidate) => candidate.meterCode.trim().toLowerCase() === meterCode
      && candidate.operationCode.trim().toLowerCase() === operationCode);
    if (matchIndex >= 0) {
      nextMeters[matchIndex] = { ...nextMeters[matchIndex]!, customerPrice: meter.customerPrice.trim() };
      continue;
    }
    appended += 1;
    nextMeters.push({
      key: `meter-copy-${target.key}-${appended}-${Date.now()}`,
      meterCode: meter.meterCode.trim(),
      operationCode: meter.operationCode.trim(),
      unitCode: meter.unitCode,
      unitSize: meter.unitSize,
      customerPrice: meter.customerPrice.trim(),
    });
  }
  return nextMeters;
}

type PriceSettingScheduleSource = Pick<PriceSettingRegionForm, 'priceMode' | 'timeZone' | 'weeklyWindows' | 'includeDates' | 'excludeDates'>;

function buildPriceSchedule(form: PriceSettingScheduleSource, t: TranslationFunction): AdminPricingSchedule | undefined {
  if (form.priceMode === 'standard') return undefined;

  const timeZone = form.timeZone.trim();
  if (!timeZone || !isIanaTimeZone(timeZone)) {
    throw new Error(t('admin.pricing.settings.form.timeZoneInvalid'));
  }
  if (form.weeklyWindows.length === 0) {
    throw new Error(t('admin.pricing.settings.form.windowsRequired'));
  }

  const windowCodes = new Set<string>();
  const weeklyWindows = form.weeklyWindows.map((window) => {
    const windowCode = window.windowCode.trim();
    if (!windowCode || windowCodes.has(windowCode)) {
      throw new Error(t('admin.pricing.settings.form.windowCodeInvalid'));
    }
    windowCodes.add(windowCode);
    if (window.daysOfWeek.length === 0) {
      throw new Error(t('admin.pricing.settings.form.daysRequired'));
    }
    if (!isClockTime(window.startTime) || !isClockTime(window.endTime)) {
      throw new Error(t('admin.pricing.settings.form.timeInvalid'));
    }

    const startTime = normalizeClockTime(window.startTime);
    const endTime = normalizeClockTime(window.endTime);
    const crossesMidnight = window.endDayOffset === 1;
    if ((!crossesMidnight && startTime >= endTime) || (crossesMidnight && startTime <= endTime)) {
      throw new Error(t('admin.pricing.settings.form.timeOrderInvalid'));
    }

    return {
      ...window,
      windowCode,
      startTime,
      endTime,
      daysOfWeek: [...new Set(window.daysOfWeek)].sort((left, right) => left - right),
    };
  });

  const includeDates = parseDateList(form.includeDates, t);
  const excludeDates = parseDateList(form.excludeDates, t);
  if (includeDates.some((date) => excludeDates.includes(date))) {
    throw new Error(t('admin.pricing.settings.form.dateOverlapInvalid'));
  }

  return { timeZone, weeklyWindows, includeDates, excludeDates };
}

function parseDateList(value: string, t: TranslationFunction): string[] {
  const dates = value.split(/[\s,]+/).map((date) => date.trim()).filter(Boolean);
  if (dates.length > 366) throw new Error(t('admin.pricing.settings.form.dateCountInvalid'));
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidIsoDate(date))) {
    throw new Error(t('admin.pricing.settings.form.dateInvalid'));
  }
  if (new Set(dates).size !== dates.length) {
    throw new Error(t('admin.pricing.settings.form.dateDuplicateInvalid'));
  }
  return dates;
}

function isValidIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseFormTimestamp(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isClockTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function normalizeClockTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
