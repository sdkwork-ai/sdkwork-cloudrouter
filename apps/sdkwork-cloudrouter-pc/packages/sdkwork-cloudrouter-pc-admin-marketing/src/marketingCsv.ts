import { maskPromotionCode } from './marketingService';

/**
 * CSV 列契约（列表导出与受审计券码导出共用）。
 *
 * `masked` 表示该列在界面上以脱敏形式展示：普通导出写脱敏值，绝不写接口原值。
 * 标签页的券码列直接读取已脱敏的 `codeMasked`，因此不需要再声明 `masked`。
 */
export interface MarketingCsvColumn {
  key: string;
  label: string;
  masked?: boolean;
}

/** UTF-8 BOM（Excel 打开中文 CSV 需要；粘贴进单元格时不可见）。 */
const CSV_BOM = '\uFEFF';

/**
 * 生成 CSV 文本：表头 + 数据行，每个单元格都用双引号包裹并转义内部引号。
 * 受审计券码导出与列表导出共用同一实现，避免两条写入路径产生不同转义语义。
 */
export function buildCsvText(
  header: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(','))
    .join('\n');
}

/**
 * 按导出契约生成列表 CSV 文本。
 *
 * 这是本包唯一的列表 CSV 写入路径：标注 `masked` 的列写 `maskPromotionCode`
 * 的结果，其余列写列表响应中的展示值。不存在“写接口原值”的导出模式——完整
 * 券码只能来自受审计的 reveal / export 调用，并由调用方单独构建行数据。
 */
export function buildMarketingCsv<T extends object>(
  records: readonly T[],
  columns: readonly MarketingCsvColumn[],
): string {
  const readCell = (record: T, column: MarketingCsvColumn): string => {
    const rawValue = (record as Record<string, unknown>)[column.key];
    const text = rawValue === null || rawValue === undefined ? '' : String(rawValue);
    if (column.masked && text !== '') {
      return maskPromotionCode(text);
    }
    return text;
  };
  return buildCsvText(
    columns.map((column) => column.label),
    records.map((record) => columns.map((column) => readCell(record, column))),
  );
}

/** 触发浏览器下载 CSV（文件名由调用方决定；内容带 UTF-8 BOM）。 */
export function downloadMarketingCsv(fileName: string, csv: string): void {
  const blob = new Blob([`${CSV_BOM}${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** 列表导出的便捷入口：按 `masked` 契约生成并下载 CSV。 */
export function exportMarketingCsv<T extends object>(
  records: readonly T[],
  columns: readonly MarketingCsvColumn[],
  fileName: string,
): void {
  downloadMarketingCsv(fileName, buildMarketingCsv(records, columns));
}
