import type { OfficialPricingRate, PricingCategoryCode } from './pricing';

/**
 * 账号分组标签字典（与后端 `SUPPORTED_TAGS` 保持一致）。
 * 价格页的分组筛选与 admin 分组编辑共用同一套标签 code。
 */
export const PRICING_GROUP_TAG_CODES = [
  'stable',
  'hot',
  'recommended',
  'promotion',
  'new',
  'premium',
  'high_value',
  'official',
  'beta',
  'limited',
] as const;

export type PricingGroupTagCode = (typeof PRICING_GROUP_TAG_CODES)[number];

/** 分组可承载的模态（后端 `SUPPORTED_MODALITIES`）。 */
export type PricingGroupModality = 'text' | 'image' | 'video' | 'audio' | 'music';

/**
 * 价格页可用的公开账号分组。
 *
 * 价格页价格来自官方费率（按资源聚合），并不直接携带账号分组维度；分组通过
 * 「厂商 + 模态」作用域映射到价格分类（一个分组只服务某厂商的某类模态），
 * 因此分组/标签筛选等价于「按分组可用范围筛选模型价格」。
 */
export interface PricingGroupOption {
  /** 分组 code，唯一标识（模型库分组 key 同一套 code）。 */
  code: string;
  /** 展示名，缺失时回退 code。 */
  name: string;
  /** 分组标签（可多个）。 */
  tags: string[];
  /** 销售倍率（如 "1.5"），仅展示。 */
  saleMultiplier?: string;
  /** 分组限定的厂商；空字符串表示不限厂商。 */
  vendorCode: string;
  /** 分组限定的模态；空数组表示不限模态。 */
  modalities: string[];
}

/** 分组标签筛选项 + 分组数量。 */
export interface PricingGroupTagFacet {
  code: string;
  count: number;
}

/** 价格页当前的分组/标签筛选状态。 */
export interface PricingGroupSelection {
  tags: readonly string[];
  groupCodes: readonly string[];
}

export const EMPTY_PRICING_GROUP_SELECTION: PricingGroupSelection = {
  tags: [],
  groupCodes: [],
};

/**
 * 模态到价格分类的映射：分组声明的模态决定它能服务哪些价格分类。
 * `text` 覆盖全部文本类计量（LLM / 向量嵌入 / API 调用 / 其他文本资源），
 * `audio` 同时覆盖音频与音效。
 */
const MODALITY_CATEGORIES: Record<string, readonly PricingCategoryCode[]> = {
  text: ['llm', 'embedding', 'api', 'other'],
  image: ['image'],
  video: ['video'],
  audio: ['audio', 'sound'],
  music: ['music'],
};

/** 一条官方费率所属的价格分类（去掉聚合用的 `all`）。 */
export function pricingRateCategories(rate: OfficialPricingRate): string[] {
  return rate.groupCodes.filter((code) => code.trim() !== '' && code !== 'all');
}

/** 分组是否包含全部所选标签（AND 语义，与 admin 分组筛选一致）。 */
export function pricingGroupHasTags(group: { tags?: readonly string[] | null }, tags: readonly string[]): boolean {
  if (tags.length === 0) return true;
  return tags.every((tag) => group.tags?.includes(tag));
}

/** 按「分组数量」聚合标签，用于标签 chips 的计数。 */
export function buildPricingGroupTagFacets(
  groups: readonly PricingGroupOption[],
): PricingGroupTagFacet[] {
  const counters = new Map<string, number>();
  for (const group of groups) {
    for (const tag of new Set(group.tags)) {
      counters.set(tag, (counters.get(tag) ?? 0) + 1);
    }
  }
  return [...counters.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}

/**
 * 分组列表筛选：标签 AND + 关键词（名称/code/标签）。
 * 关键词为空时只按标签过滤。
 */
export function filterPricingGroups(
  groups: readonly PricingGroupOption[],
  query: string,
  tags: readonly string[],
): PricingGroupOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  return groups.filter((group) => {
    if (!pricingGroupHasTags(group, tags)) return false;
    if (normalizedQuery.length === 0) return true;
    return [group.name, group.code, ...group.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

/** 是否有生效中的分组筛选（标签或具体分组）。 */
export function hasPricingGroupSelection(selection: PricingGroupSelection): boolean {
  return selection.tags.length > 0 || selection.groupCodes.length > 0;
}

/**
 * 当前筛选命中的分组：先按标签收窄，再按显式勾选的分组收窄。
 * 标签命中但未被勾选的分组在勾选列表为空时全部生效。
 */
export function resolveSelectedPricingGroups(
  groups: readonly PricingGroupOption[],
  selection: PricingGroupSelection,
): PricingGroupOption[] {
  const tagged = selection.tags.length > 0
    ? groups.filter((group) => pricingGroupHasTags(group, selection.tags))
    : [...groups];
  if (selection.groupCodes.length === 0) {
    return tagged;
  }
  const selectedCodes = new Set(selection.groupCodes);
  return tagged.filter((group) => selectedCodes.has(group.code));
}

/**
 * 单个分组是否服务某条费率：厂商必须一致（声明了才校验），
 * 模态映射出的价格分类必须命中费率分类（声明了才校验）。
 */
export function pricingGroupMatchesRate(
  group: PricingGroupOption,
  rate: OfficialPricingRate,
): boolean {
  const vendorCode = group.vendorCode.trim();
  if (vendorCode.length > 0 && vendorCode !== rate.vendorCode) {
    return false;
  }
  const categories = new Set<string>();
  for (const modality of group.modalities) {
    for (const category of MODALITY_CATEGORIES[modality.trim().toLowerCase()] ?? []) {
      categories.add(category);
    }
  }
  // 未声明模态（或声明了未知模态）时不额外收窄，避免空集合把分组筛空。
  if (categories.size === 0) {
    return true;
  }
  return pricingRateCategories(rate).some((category) => categories.has(category));
}

/**
 * 分组的销售倍率（默认 1.0）。官方分组固定 1.0，账号分组按配置的倍率折算。
 */
export function pricingGroupMultiplier(group: PricingGroupOption): string {
  const multiplier = group.saleMultiplier?.trim() ?? '';
  return multiplier.length > 0 ? multiplier : '1';
}

/** 倍率的数值（仅用于排序/展示，价格计算仍走精确十进制乘法）。 */
export function pricingGroupMultiplierValue(group: PricingGroupOption): number {
  const value = Number.parseFloat(pricingGroupMultiplier(group));
  return Number.isFinite(value) ? value : 1;
}

/**
 * 服务某个模型的账号分组列表（按倍率从低到高排序，同倍率按名称），
 * 用于「一行一个模型 + 每行首个官方分组卡片 + 后续分组价格卡片」的列顺序。
 */
export function pricingGroupsServingRates(
  groups: readonly PricingGroupOption[],
  rates: readonly OfficialPricingRate[],
): PricingGroupOption[] {
  return groups
    .filter((group) => rates.some((rate) => pricingGroupMatchesRate(group, rate)))
    .sort(
      (left, right) =>
        pricingGroupMultiplierValue(left) - pricingGroupMultiplierValue(right)
        || left.name.localeCompare(right.name)
        || left.code.localeCompare(right.code),
    );
}

/**
 * 生成价格行过滤器。没有分组/标签筛选时恒为真；
 * 有筛选但没有任何命中的分组时恒为假（明确的空结果）。
 */
export function buildPricingGroupRateMatcher(
  groups: readonly PricingGroupOption[],
  selection: PricingGroupSelection,
): (rate: OfficialPricingRate) => boolean {
  if (!hasPricingGroupSelection(selection)) {
    return () => true;
  }
  const selectedGroups = resolveSelectedPricingGroups(groups, selection);
  if (selectedGroups.length === 0) {
    return () => false;
  }
  return (rate) => selectedGroups.some((group) => pricingGroupMatchesRate(group, rate));
}

/** 切换数组中的某个值（多选 chip / checkbox 共用）。 */
export function toggleSelectionValue(values: readonly string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
