/**
 * 供应商"复制为新建"的命名投影。
 *
 * 复制动作打开的是**创建**表单：来源供应商的内容被预填，提交时创建一条新记录。
 * 供应商名称只是运营侧标识，`supplierCode` 由后端生成，因此复制时唯一需要
 * 前端保证的是默认名称不与列表中的记录重名（否则运营无法在新旧记录间区分）。
 */

/** 供应商名称上限（OpenAPI `supplierName.maxLength` / 路由 `MAX_NAME_LENGTH`）。 */
export const SUPPLIER_NAME_MAX_LENGTH = 200;

export interface SupplierCopyNameSource {
  /** 来源供应商名称，缺失时回退到供应商编码。 */
  supplierName?: string | null;
  supplierCode?: string | null;
}

export interface SupplierCopyNameCandidate {
  supplierName: string;
}

/** `-copy-99` 的最长形式：预留足够的命名空间，保证追加后缀后不超过后端上限。 */
const COPY_SUFFIX_RESERVE = '-copy-99'.length;

/**
 * 生成复制后的默认供应商名称：`<原名>-copy`；列表里已占用时递增为
 * `-copy-2`、`-copy-3`…，并按 200 字符上限截断原名称。
 *
 * @param source 被复制的供应商
 * @param existing 当前可见的供应商记录（用于避免与已有名称重名）
 */
export function uniqueSupplierCopyName(
  source: SupplierCopyNameSource,
  existing: readonly SupplierCopyNameCandidate[],
): string {
  const used = new Set(existing.map((item) => item.supplierName));
  const base = ([source.supplierName, source.supplierCode]
    .map((value) => (value ?? '').trim())
    .find((value) => value.length > 0)) ?? '';
  const stem = base.slice(0, Math.max(1, SUPPLIER_NAME_MAX_LENGTH - COPY_SUFFIX_RESERVE));
  let candidate = `${stem}-copy`;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${stem}-copy-${index}`;
    index += 1;
  }
  return candidate;
}
