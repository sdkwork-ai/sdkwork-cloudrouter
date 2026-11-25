import type { OfficialPricingValueFacet } from './pricing';

/**
 * 厂商筛选的默认可见数量：厂商是价格页第一优先级筛选维度，
 * 展开后一次性铺开（参考“品牌行”展开式分类展示），折叠时保留一行。
 */
export const VENDOR_FACET_VISIBLE_LIMIT = 12;

/** 解析 facet 的字符串计数，用于按热度排序（无法解析时按 0）。 */
export function pricingFacetCount(facet: { count: string }): number {
  const parsed = Number.parseInt(facet.count, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * 厂商排序：价格条目多的厂商优先，其次按展示名（code 兜底）稳定排序。
 * 与左侧价格分类一致，用户最关心的供应商排在最前面。
 */
export function orderVendorFacets(
  vendors: readonly OfficialPricingValueFacet[],
  displayName: (code: string) => string,
): OfficialPricingValueFacet[] {
  return [...vendors].sort(
    (left, right) =>
      pricingFacetCount(right) - pricingFacetCount(left)
      || displayName(left.code).localeCompare(displayName(right.code))
      || left.code.localeCompare(right.code),
  );
}

export interface VendorFacetView {
  visible: OfficialPricingValueFacet[];
  hiddenCount: number;
}

/**
 * 折叠/展开后的可见厂商列表。
 * 已选厂商若不在前 N 个里会被钉到首位，避免筛选生效却看不到当前选项。
 */
export function resolveVendorFacetView(
  ordered: readonly OfficialPricingValueFacet[],
  options: { expanded: boolean; limit?: number; selectedCode?: string },
): VendorFacetView {
  const limit = options.limit ?? VENDOR_FACET_VISIBLE_LIMIT;
  if (options.expanded || ordered.length <= limit) {
    return { visible: [...ordered], hiddenCount: 0 };
  }
  const head = ordered.slice(0, limit);
  const selectedCode = options.selectedCode ?? '';
  if (selectedCode.length === 0 || head.some((facet) => facet.code === selectedCode)) {
    return { visible: head, hiddenCount: ordered.length - head.length };
  }
  const selected = ordered.find((facet) => facet.code === selectedCode);
  if (!selected) {
    return { visible: head, hiddenCount: ordered.length - head.length };
  }
  return {
    visible: [selected, ...head.slice(0, Math.max(0, limit - 1))],
    hiddenCount: ordered.length - head.length,
  };
}

/** “全部厂商”徽章的总数：每条价格只归属一个厂商，因此计数可直接求和。 */
export function totalVendorFacetCount(vendors: readonly OfficialPricingValueFacet[]): number {
  return vendors.reduce((total, facet) => total + pricingFacetCount(facet), 0);
}
