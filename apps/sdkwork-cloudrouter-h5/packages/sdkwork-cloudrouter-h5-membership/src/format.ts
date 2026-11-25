/** zh-CN money rendering for the membership commerce surfaces (major units). */
export function formatMembershipCurrencyCny(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return new Intl.NumberFormat('zh-CN', {
    currency: 'CNY',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

/** zh-CN compute-credit rendering; credits may carry 6 decimal places. */
export function formatMembershipPointsValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value);
}
