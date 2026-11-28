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

/**
 * 价格页可见的分组类型（与后端 `ai_upstream_account_group.group_type`
 * 的 `mixed`/`llm`/`image`/`video`/`audio`/`music` 词表对齐）。
 *
 * 价格页拿到的是分组的模态声明，因此类型由模态集合归类：
 * `text` → LLM，`image` → 图片，`video` → 视频，`music` → 音乐，
 * `audio` → 语音；未声明模态（不限定适用范围）或跨多个模态的分组归为「混合」。
 */
export const PRICING_GROUP_TYPE_CODES = [
  'llm',
  'image',
  'video',
  'music',
  'voice',
  'mixed',
] as const;

export type PricingGroupTypeCode = (typeof PRICING_GROUP_TYPE_CODES)[number];

/** 模态 code → 分组类型。未列出的模态不参与归类（按「混合」处理）。 */
const MODALITY_GROUP_TYPES: Record<string, PricingGroupTypeCode> = {
  text: 'llm',
  image: 'image',
  video: 'video',
  music: 'music',
  audio: 'voice',
};

/** 分组类型筛选项 + 分组数量。 */
export interface PricingGroupTypeFacet {
  code: PricingGroupTypeCode;
  count: number;
}

/** 价格页当前的分组/标签筛选状态。 */
export interface PricingGroupSelection {
  /** 选中的分组类型；空数组表示不限类型。 */
  types: readonly PricingGroupTypeCode[];
  tags: readonly string[];
  groupCodes: readonly string[];
}

export const EMPTY_PRICING_GROUP_SELECTION: PricingGroupSelection = {
  types: [],
  tags: [],
  groupCodes: [],
};

/** 一个分组所属的类型：单模态按模态归类，多模态/未声明模态归为「混合」。 */
export function pricingGroupType(group: {
  modalities?: readonly string[] | null;
}): PricingGroupTypeCode {
  const modalities = new Set(
    (group.modalities ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
  if (modalities.size === 0) {
    return 'mixed';
  }
  const types = new Set<PricingGroupTypeCode>();
  for (const modality of modalities) {
    const type = MODALITY_GROUP_TYPES[modality];
    // 词表外的模态（例如未来新增的能力）不收窄成某种单模态，避免误判。
    if (type === undefined) {
      return 'mixed';
    }
    types.add(type);
  }
  if (types.size !== 1) {
    return 'mixed';
  }
  return [...types][0] ?? 'mixed';
}

/** 分组是否命中所选类型；未选类型时不做限制。 */
export function pricingGroupMatchesType(
  group: { modalities?: readonly string[] | null },
  types: readonly PricingGroupTypeCode[],
): boolean {
  if (types.length === 0) return true;
  return types.includes(pricingGroupType(group));
}

/** 按类型聚合可选分组数量（不含空类型）。 */
export function buildPricingGroupTypeFacets(
  groups: readonly PricingGroupOption[],
): PricingGroupTypeFacet[] {
  const counters = new Map<PricingGroupTypeCode, number>();
  for (const group of groups) {
    const type = pricingGroupType(group);
    counters.set(type, (counters.get(type) ?? 0) + 1);
  }
  return PRICING_GROUP_TYPE_CODES
    .filter((code) => (counters.get(code) ?? 0) > 0)
    .map((code) => ({ code, count: counters.get(code) ?? 0 }));
}

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

/** 分组列表筛选条件：类型 + 标签（AND）+ 关键词（名称/code/标签）。 */
export interface PricingGroupFilterInput {
  query: string;
  tags: readonly string[];
  types: readonly PricingGroupTypeCode[];
}

/**
 * 分组列表筛选：先按分组类型、再按标签（AND）、最后按关键词收窄。
 * 关键词为空时只按类型与标签过滤。
 */
export function filterPricingGroups(
  groups: readonly PricingGroupOption[],
  input: PricingGroupFilterInput,
): PricingGroupOption[] {
  const normalizedQuery = input.query.trim().toLowerCase();
  return groups.filter((group) => {
    if (!pricingGroupMatchesType(group, input.types)) return false;
    if (!pricingGroupHasTags(group, input.tags)) return false;
    if (normalizedQuery.length === 0) return true;
    return [group.name, group.code, ...group.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

/** 是否有生效中的分组筛选（类型、标签或具体分组）。 */
export function hasPricingGroupSelection(selection: PricingGroupSelection): boolean {
  return selection.types.length > 0 || selection.tags.length > 0 || selection.groupCodes.length > 0;
}

/**
 * 当前筛选命中的分组：先按类型收窄，再按标签收窄，最后按显式勾选的分组收窄。
 * 标签命中但未被勾选的分组在勾选列表为空时全部生效。
 */
export function resolveSelectedPricingGroups(
  groups: readonly PricingGroupOption[],
  selection: PricingGroupSelection,
): PricingGroupOption[] {
  const narrowed = groups.filter(
    (group) =>
      pricingGroupMatchesType(group, selection.types)
      && pricingGroupHasTags(group, selection.tags),
  );
  if (selection.groupCodes.length === 0) {
    return narrowed;
  }
  const selectedCodes = new Set(selection.groupCodes);
  return narrowed.filter((group) => selectedCodes.has(group.code));
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
 * 生成价格行过滤器。没有分组/类型/标签筛选时恒为真；
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
export function toggleSelectionValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
