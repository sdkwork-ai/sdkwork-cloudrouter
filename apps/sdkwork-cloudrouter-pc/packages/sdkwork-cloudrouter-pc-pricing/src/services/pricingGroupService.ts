import {
  getCloudRouterAppSdkClient,
  readApiRecord,
  readNullableString,
  readRecordArray,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { PricingGroupOption } from '../types/pricingGroup';

/** 一次读取的公开分组数量（当前线上分组规模远小于该值）。 */
const PRICING_GROUP_PAGE_SIZE = 200;

/**
 * 读取价格页分组筛选所需的公开账号分组（含标签、销售倍率、厂商/模态作用域）。
 *
 * 价格页是公开页面，数据来自 app-api 的 `/ai/routing/account_groups`
 * （会话内可见的公开分组）。读取失败时由页面向用户降级提示，不影响官方价格。
 */
export async function fetchPricingGroups(signal?: AbortSignal): Promise<PricingGroupOption[]> {
  const result = await getCloudRouterAppSdkClient().ai.routing.accountGroups.list(
    { page: 1, pageSize: PRICING_GROUP_PAGE_SIZE },
    { signal },
  );
  return normalizePricingGroups(readRecordArray(readApiRecord(result), 'items'));
}

/**
 * 把接口记录规范化为分组筛选项：跳过停用/无 code 的分组，按 code 去重。
 * 纯函数，便于单测覆盖脏数据的降级行为。
 */
export function normalizePricingGroups(records: readonly ApiRecord[]): PricingGroupOption[] {
  const groups = new Map<string, PricingGroupOption>();
  for (const record of records) {
    const code = readString(record, 'groupCode').trim();
    if (code.length === 0 || groups.has(code)) {
      continue;
    }
    // 停用分组不参与价格页筛选，否则会筛出没有任何在线服务的空分组。
    if (readString(record, 'status').trim().toLowerCase() === 'disabled') {
      continue;
    }
    const name = readString(record, 'groupName').trim() || code;
    const saleMultiplier = readNullableString(record, 'saleMultiplier')?.trim();
    groups.set(code, {
      code,
      name,
      tags: uniqueValues(readStringArray(record, 'tags')),
      ...(saleMultiplier && saleMultiplier.length > 0 ? { saleMultiplier } : {}),
      vendorCode: (readNullableString(record, 'vendorCode') ?? '').trim().toLowerCase(),
      modalities: uniqueValues(readStringArray(record, 'modalities').map((value) => value.trim().toLowerCase())),
    });
  }
  return [...groups.values()].sort(
    (left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code),
  );
}

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}
