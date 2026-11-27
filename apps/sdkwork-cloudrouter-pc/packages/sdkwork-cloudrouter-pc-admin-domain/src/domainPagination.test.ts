// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { buildPaginationPageItems } from '@sdkwork/cloudroutes-pc-commons/components/BottomPagination';

import {
  DOMAIN_DEFAULT_PAGE_SIZE,
  clampDomainPage,
  domainPaginationIsAddressable,
  normalizeDomainPageSize,
  parseDomainTotalItems,
  readDomainStoredPageSize,
  resolveDomainPagination,
  writeDomainStoredPageSize,
} from './domainPagination';

describe('parseDomainTotalItems', () => {
  it('reads the v3 decimal string total', () => {
    expect(parseDomainTotalItems('137')).toBe(137);
    expect(parseDomainTotalItems('0')).toBe(0);
  });

  it('treats a missing, negative, or non-numeric total as unknown', () => {
    expect(parseDomainTotalItems(undefined)).toBeNull();
    expect(parseDomainTotalItems(null)).toBeNull();
    expect(parseDomainTotalItems('-1')).toBeNull();
    expect(parseDomainTotalItems('many')).toBeNull();
  });
});

describe('resolveDomainPagination', () => {
  it('prefers the server page window and exact total', () => {
    const snapshot = resolveDomainPagination(2, 20, 20, {
      page: 2,
      pageSize: 20,
      totalItems: '137',
      totalPages: 7,
      hasMore: true,
    });

    expect(snapshot).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 137,
      totalPages: 7,
      hasMore: true,
    });
  });

  it('derives the page count and next page from the total when the server omits them', () => {
    const snapshot = resolveDomainPagination(3, 20, 20, { totalItems: '41' });

    expect(snapshot.totalPages).toBe(3);
    expect(snapshot.hasMore).toBe(false);
  });

  it('falls back to "the page came back full" when the server reports no total', () => {
    expect(resolveDomainPagination(1, 20, 20, {}).hasMore).toBe(true);
    expect(resolveDomainPagination(1, 20, 19, {}).hasMore).toBe(false);
  });

  it('clamps a page the server reports past the end', () => {
    const snapshot = resolveDomainPagination(9, 20, 0, { totalItems: '41', totalPages: 3, page: 9 });

    expect(snapshot.page).toBe(3);
  });

  it('keeps a bounded single page addressable but not numbered', () => {
    const snapshot = resolveDomainPagination(1, 20, 3, { totalItems: '3', totalPages: 1 });

    expect(snapshot.hasMore).toBe(false);
    expect(domainPaginationIsAddressable(snapshot)).toBe(false);
  });
});

describe('page numbers', () => {
  it('clamps requested pages into range', () => {
    expect(clampDomainPage(0, 7)).toBe(1);
    expect(clampDomainPage(-3, 7)).toBe(1);
    expect(clampDomainPage(4, 7)).toBe(4);
    expect(clampDomainPage(99, 7)).toBe(7);
    expect(clampDomainPage(99, null)).toBe(99);
  });

  it('keeps page sizes the menu offers and never returns zero', () => {
    expect(normalizeDomainPageSize(50)).toBe(50);
    expect(normalizeDomainPageSize(0)).toBe(DOMAIN_DEFAULT_PAGE_SIZE);
    expect(normalizeDomainPageSize(Number.NaN)).toBe(DOMAIN_DEFAULT_PAGE_SIZE);
  });
});

describe('buildPaginationPageItems', () => {
  const pagesOf = (items: ReturnType<typeof buildPaginationPageItems>) =>
    items.map((item) => (item.kind === 'page' ? item.page : '…'));

  it('lists every page when the window fits', () => {
    expect(pagesOf(buildPaginationPageItems(2, 5))).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the first and last page reachable with elisions around the current page', () => {
    expect(pagesOf(buildPaginationPageItems(5, 10))).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('extends the window at the end instead of eliding a single page', () => {
    expect(pagesOf(buildPaginationPageItems(10, 10))).toEqual([1, '…', 7, 8, 9, 10]);
    expect(pagesOf(buildPaginationPageItems(3, 10))).toEqual([1, 2, 3, 4, '…', 10]);
  });

  it('returns nothing for an empty list', () => {
    expect(buildPaginationPageItems(1, 0)).toEqual([]);
  });
});

describe('stored rows-per-page preference', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('round-trips a size the footer offers', () => {
    expect(readDomainStoredPageSize()).toBeNull();
    writeDomainStoredPageSize(50);
    expect(readDomainStoredPageSize()).toBe(50);
  });

  it('ignores a stored value the footer cannot render', () => {
    sessionStorage.setItem('sdkwork.cloudrouter.domainCenter.pageSize', '37');
    expect(readDomainStoredPageSize()).toBeNull();
  });
});
