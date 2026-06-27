import {
  ensureSdkworkApiSuccess,
  isRecord,
  readApiRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readRequiredApiItems,
  readRequiredString,
  readString,
  requiredSafePathSegment,
  type ApiRecord,
  readMediaResource,
  type ClawRouterMediaResource,
  getClawRouterBackendSdkClient,
  type AdminCategoryOption,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export type { AdminCategoryOption } from '@sdkwork/clawroutes-pc-commons/runtime';

export interface AdminAiCategoryCreateInput {
  name: string;
  code?: string;
  description?: string;
  icon?: ClawRouterMediaResource;
  parentId?: string | null;
  path?: string;
  sortWeight?: number;
  status?: number;
  type?: number;
  visible?: boolean;
}

export interface AdminAiCategoryUpdateInput {
  name?: string;
  code?: string | null;
  description?: string | null;
  icon?: ClawRouterMediaResource;
  parentId?: string | null;
  path?: string | null;
  sortWeight?: number;
  status?: number;
  type?: number;
  visible?: boolean;
}

const CATEGORY_OWNERSHIP_ERROR = 'Category management is owned by sdkwork-kernel; Claw Router exposes read-only category filters derived from prompt and MCP records.';

export async function listAdminAiCategoryOptions(): Promise<AdminCategoryOption[]> {
  const client = getClawRouterBackendSdkClient();
  const [promptResult, mcpResult] = await Promise.all([
    client.prompts.definitions.list({ page: '1', pageSize: '500' }),
    client.mcp.servers.list({ page: '1', pageSize: '500' }),
  ]);
  ensureSdkworkApiSuccess(promptResult, 'Failed to load prompt categories');
  ensureSdkworkApiSuccess(mcpResult, 'Failed to load MCP categories');

  const categories = new Map<string, AdminCategoryOption>();
  for (const item of [
    ...readRequiredApiItems(promptResult, 'Prompt list response is missing items'),
    ...readRequiredApiItems(mcpResult, 'MCP list response is missing items'),
  ]) {
    appendDerivedCategoryOption(categories, item);
  }

  return [...categories.values()].sort(compareAdminCategoryOptions);
}

export async function createAdminAiCategory(_input: AdminAiCategoryCreateInput): Promise<AdminCategoryOption> {
  throw new Error(CATEGORY_OWNERSHIP_ERROR);
}

export async function updateAdminAiCategory(_categoryId: string, _input: AdminAiCategoryUpdateInput): Promise<AdminCategoryOption> {
  throw new Error(CATEGORY_OWNERSHIP_ERROR);
}

export async function deleteAdminAiCategory(_categoryId: string): Promise<boolean> {
  throw new Error(CATEGORY_OWNERSHIP_ERROR);
}

export function formatAdminCategoryOptionLabel(category: AdminCategoryOption): string {
  if (!category.code || category.code === category.name) {
    return category.name;
  }
  return `${category.name} (${category.code})`;
}

export function getAdminCategoryDisplayName(
  categoryOptions: readonly AdminCategoryOption[],
  categoryId: unknown,
  categoryCode: unknown,
): string {
  const normalizedId = normalizeDisplayValue(categoryId);
  const normalizedCode = normalizeDisplayValue(categoryCode);
  const category = normalizedId
    ? categoryOptions.find((item) => item.id === normalizedId)
    : normalizedCode
      ? categoryOptions.find((item) => item.code === normalizedCode)
      : undefined;
  if (category) {
    return category.name;
  }
  return normalizedCode ?? (normalizedId ? `#${normalizedId}` : '');
}

export function attachAdminCategoryNamesToResult<T>(
  result: T,
  categoryOptions: readonly AdminCategoryOption[],
): T {
  if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.items)) {
    return result;
  }
  return {
    ...result,
    data: {
      ...result.data,
      items: result.data.items.map((item) => attachAdminCategoryName(item, categoryOptions)),
    },
  } as T;
}

function appendDerivedCategoryOption(
  categories: Map<string, AdminCategoryOption>,
  value: unknown,
): void {
  if (!isRecord(value)) {
    return;
  }
  const categoryId = readNullableString(value, 'categoryId');
  if (!categoryId) {
    return;
  }
  if (categories.has(categoryId)) {
    return;
  }
  const categoryCode = readString(value, 'categoryCode');
  categories.set(categoryId, {
    id: categoryId,
    name: categoryCode || categoryId,
    code: categoryCode,
    description: undefined,
    icon: undefined,
    parentId: null,
    path: undefined,
    sortWeight: categories.size,
    status: 1,
    type: 19,
    visible: true,
  });
}

function attachAdminCategoryName(
  item: unknown,
  categoryOptions: readonly AdminCategoryOption[],
): unknown {
  if (!isRecord(item)) {
    return item;
  }
  return {
    ...item,
    categoryName: getAdminCategoryDisplayName(categoryOptions, item.categoryId, item.categoryCode),
  };
}

function compareAdminCategoryOptions(left: AdminCategoryOption, right: AdminCategoryOption): number {
  return left.sortWeight - right.sortWeight
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id);
}

function normalizeDisplayValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}
