/**
 * Pagination projection shared by every Domain Center table.
 *
 * The deployments control plane answers offset pages (`page` / `page_size`) with
 * an exact `pageInfo.totalItems` and `pageInfo.totalPages`, so this module only
 * has to normalize what the wire reports: numbers arrive as strings for 64-bit
 * totals, every field is optional, and a server that omits an exact total still
 * has to render a usable next/previous control.
 *
 * Nothing here slices an array. The table renders the page the server returned;
 * this module decides what the footer says about that page.
 */

/** Rows per page offered by the Domain Center footers. */
export const DOMAIN_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** First render of a Domain Center table, matching the platform default. */
export const DOMAIN_DEFAULT_PAGE_SIZE = 20;

/** Structural subset of `PageInfo` this surface reads. */
export interface DomainPageInfoLike {
  page?: number | undefined;
  pageSize?: number | undefined;
  totalItems?: string | undefined;
  totalPages?: number | undefined;
  hasMore?: boolean | undefined;
}

export interface DomainPaginationSnapshot {
  /** 1-based page the table is showing. */
  page: number;
  pageSize: number;
  /** Exact number of matching rows, or `null` when the server did not report one. */
  totalItems: number | null;
  totalPages: number | null;
  /** Whether a further page exists. Derived from the exact total when possible. */
  hasMore: boolean;
}

function toFiniteInteger(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
}

/** Clamps a page size to the offered choices so the `<select>` never shows a blank. */
export function normalizeDomainPageSize(value: number): number {
  const candidate = toFiniteInteger(value);
  if (candidate === null || candidate < 1) {
    return DOMAIN_DEFAULT_PAGE_SIZE;
  }
  if ((DOMAIN_PAGE_SIZE_OPTIONS as readonly number[]).includes(candidate)) {
    return candidate;
  }
  // Keep a server-echoed size that is not in the menu usable rather than
  // rewriting it: the options list is an affordance, not the wire contract.
  return candidate;
}

/** Clamps a requested page into `1..totalPages` (or `1..` when the total is unknown). */
export function clampDomainPage(page: number, totalPages: number | null): number {
  const candidate = toFiniteInteger(page);
  const lowerBounded = candidate === null || candidate < 1 ? 1 : candidate;
  if (totalPages === null || totalPages < 1) {
    return lowerBounded;
  }
  return Math.min(lowerBounded, totalPages);
}

/** Parses `pageInfo.totalItems`, which the v3 wire types as a decimal string. */
export function parseDomainTotalItems(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.trunc(parsed);
}

/**
 * Normalizes one server page into the footer's state.
 *
 * `hasMore` prefers the server's own flag, then the exact total, and only falls
 * back to "the page came back full" when the server reported no total at all —
 * that fallback keeps a bounded list's next button honest instead of guessing.
 */
export function resolveDomainPagination(
  requestedPage: number,
  requestedPageSize: number,
  itemCount: number,
  pageInfo?: DomainPageInfoLike | undefined,
): DomainPaginationSnapshot {
  const pageSize = normalizeDomainPageSize(
    toFiniteInteger(pageInfo?.pageSize) ?? requestedPageSize,
  );
  const totalItems = parseDomainTotalItems(pageInfo?.totalItems);
  const reportedTotalPages = toFiniteInteger(pageInfo?.totalPages);
  const totalPages = reportedTotalPages !== null && reportedTotalPages >= 0
    ? reportedTotalPages
    : totalItems !== null
      ? Math.ceil(totalItems / pageSize)
      : null;
  const page = clampDomainPage(
    toFiniteInteger(pageInfo?.page) ?? requestedPage,
    totalPages,
  );
  const hasMore = typeof pageInfo?.hasMore === 'boolean'
    ? pageInfo.hasMore
    : totalItems !== null
      ? totalItems > page * pageSize
      : itemCount >= pageSize;

  return { page, pageSize, totalItems, totalPages, hasMore };
}

/** Whether the numbered strip can offer a page the operator could actually open. */
export function domainPaginationIsAddressable(
  pagination: Pick<DomainPaginationSnapshot, 'totalPages'>,
): boolean {
  return pagination.totalPages !== null && pagination.totalPages > 1;
}

/**
 * Rows-per-page preference, shared by every Domain Center table.
 *
 * An operator who opens 50 rows on the zone table means it for the hostname table
 * too, and means it for the next visit. Session scope keeps the preference out of
 * a shared browser profile and disappears with the tab. Storage is optional: a
 * privacy mode that throws on access simply keeps the default.
 */
const DOMAIN_PAGE_SIZE_STORAGE_KEY = 'sdkwork.cloudrouter.domainCenter.pageSize';

export function readDomainStoredPageSize(): number | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(DOMAIN_PAGE_SIZE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    return (DOMAIN_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDomainStoredPageSize(pageSize: number): void {
  try {
    globalThis.sessionStorage?.setItem(DOMAIN_PAGE_SIZE_STORAGE_KEY, String(pageSize));
  } catch {
    // Storage is a preference, not a feature: a blocked quota keeps the default.
  }
}
