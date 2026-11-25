/** zh-CN money rendering for the membership commerce surfaces (major units). */
export function formatMembershipCurrency(
  value: number | null | undefined,
  currencyCode = 'CNY',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  const currency = currencyCode?.trim().toUpperCase() || 'CNY';
  try {
    return new Intl.NumberFormat('zh-CN', {
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export function formatMembershipCurrencyCny(value: number | null | undefined): string {
  return formatMembershipCurrency(value, 'CNY');
}

/** zh-CN compute-credit rendering; credits may carry up to 6 decimal places. */
export function formatMembershipPointsValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value);
}
