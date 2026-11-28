/**
 * One server page of a Domain Center list, with the footer state that page implies.
 *
 * Per `PAGINATION_SPEC.md` §8 every interactive list asks the server for exactly
 * one page; nothing here aggregates pages or slices a downloaded array. The hook
 * owns the three things a table footer must get right and a page component should
 * not re-implement:
 *
 * 1. a query change (filter, zone, keyword) returns to page 1 — the only page
 *    whose rows are still guaranteed to belong to the new result set;
 * 2. a response that lands past the last page (someone deleted the only row of
 *    the final page) re-queries the last page that still exists instead of
 *    rendering an empty window;
 * 3. a stale response never overwrites a newer one, so typing in a search box
 *    cannot make an old page flash back on screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DOMAIN_DEFAULT_PAGE_SIZE,
  clampDomainPage,
  normalizeDomainPageSize,
  readDomainStoredPageSize,
  resolveDomainPagination,
  writeDomainStoredPageSize,
  type DomainPaginationSnapshot,
} from '../domainPagination';
import type { DomainPage } from '../domainService';

export type DomainListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDomainPagedListOptions<T> {
  /** Loads one server page. Read through a ref; identity may change every render. */
  load: (page: number, pageSize: number) => Promise<DomainPage<T>>;
  /**
   * Identity of the active query — every filter value plus any scope (zone id).
   *
   * Changing it resets the pager to page 1 and re-queries. Two different filter
   * combinations must never share a query key, or the table would keep showing
   * page 3 of the previous result set.
   */
  queryKey: string;
  initialPageSize?: number;
  /** Skips the request until the list has a scope (for example: no zone picked). */
  enabled?: boolean;
}

export interface DomainPagedList<T> extends DomainPaginationSnapshot {
  items: T[];
  status: DomainListStatus;
  /** A request is in flight while the previous page is still on screen. */
  isRefreshing: boolean;
  error: unknown;
  reload: () => void;
  goToPage: (page: number) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  changePageSize: (pageSize: number) => void;
  /**
   * Applies a result of an in-place command (status toggle, optimistic delete)
   * to the rows already on screen, without re-querying the page.
   *
   * The footer total stays as the server last reported it; callers that changed
   * the row count also call `reload()` so `pageInfo` catches up.
   */
  updateItems: (updater: (items: T[]) => T[]) => void;
}

interface PagerState {
  queryKey: string;
  page: number;
  pageSize: number;
}

interface PageSnapshot<T> extends DomainPaginationSnapshot {
  items: T[];
}

const EMPTY_PAGINATION: DomainPaginationSnapshot = {
  page: 1,
  pageSize: 20,
  totalItems: null,
  totalPages: null,
  hasMore: false,
};

export function useDomainPagedList<T>({
  load,
  queryKey,
  initialPageSize,
  enabled = true,
}: UseDomainPagedListOptions<T>): DomainPagedList<T> {
  const [pager, setPager] = useState<PagerState>(() => ({
    queryKey,
    page: 1,
    pageSize: normalizeDomainPageSize(
      initialPageSize ?? readDomainStoredPageSize() ?? DOMAIN_DEFAULT_PAGE_SIZE,
    ),
  }));
  const [snapshot, setSnapshot] = useState<PageSnapshot<T> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Reset to the first page during the same render that changed the query, so the
  // request effect below never fires once for the stale page and again for page 1.
  // The previous query's rows are dropped in the same breath: a row from the old
  // filter is not "still loading", it is wrong.
  if (pager.queryKey !== queryKey) {
    setPager({ queryKey, page: 1, pageSize: pager.pageSize });
    setSnapshot(null);
    setError(null);
  }

  const loadRef = useRef(load);
  loadRef.current = load;
  const requestRef = useRef(0);
  const snapshotRef = useRef<PageSnapshot<T> | null>(null);
  snapshotRef.current = snapshot;

  const { page, pageSize } = pager;

  useEffect(() => {
    if (!enabled) {
      requestRef.current += 1;
      setSnapshot(null);
      setError(null);
      setPending(false);
      return;
    }
    let active = true;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setPending(true);
    setError(null);

    loadRef.current(page, pageSize)
      .then((result) => {
        if (!active || requestRef.current !== requestId) {
          return;
        }
        const pagination = resolveDomainPagination(page, pageSize, result.items.length, result.pageInfo);
        const lastPage = pagination.totalPages;
        if (result.items.length === 0 && page > 1 && lastPage !== null && lastPage < page) {
          // The window disappeared (the last row on this page was deleted, or a
          // filter shrank the set). Re-query the last page that still exists.
          setPager((current) => (
            current.page === page && current.pageSize === pageSize
              ? { ...current, page: Math.max(1, lastPage) }
              : current
          ));
          return;
        }
        setSnapshot({ items: result.items, ...pagination });
        setPending(false);
      })
      .catch((cause: unknown) => {
        if (!active || requestRef.current !== requestId) {
          return;
        }
        setSnapshot(null);
        setError(cause);
        setPending(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, page, pageSize, queryKey, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    writeDomainStoredPageSize(pageSize);
  }, [pageSize]);

  const goToPage = useCallback((nextPage: number) => {
    setPager((current) => {
      const target = clampDomainPage(
        nextPage,
        snapshotRef.current?.totalPages ?? null,
      );
      return target === current.page ? current : { ...current, page: target };
    });
  }, []);

  const goToPreviousPage = useCallback(() => {
    setPager((current) => ({ ...current, page: Math.max(1, current.page - 1) }));
  }, []);

  const goToNextPage = useCallback(() => {
    setPager((current) => {
      const totalPages = snapshotRef.current?.totalPages ?? null;
      if (totalPages !== null && current.page >= totalPages) {
        return current;
      }
      return { ...current, page: current.page + 1 };
    });
  }, []);

  const changePageSize = useCallback((nextPageSize: number) => {
    setPager((current) => {
      const normalized = normalizeDomainPageSize(nextPageSize);
      return normalized === current.pageSize
        ? current
        : { pageSize: normalized, page: 1, queryKey: current.queryKey };
    });
  }, []);

  const updateItems = useCallback((updater: (items: T[]) => T[]) => {
    setSnapshot((current) => {
      if (current === null) {
        return current;
      }
      const items = updater(current.items);
      return items === current.items ? current : { ...current, items };
    });
  }, []);

  const pagination = snapshot ?? EMPTY_PAGINATION;
  const status: DomainListStatus = !enabled
    ? 'idle'
    : error !== null
      ? 'error'
      : snapshot !== null
        ? 'ready'
        : 'loading';

  return {
    items: snapshot?.items ?? [],
    page,
    pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
    hasMore: pagination.hasMore,
    status,
    isRefreshing: pending && snapshot !== null,
    error,
    reload,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    changePageSize,
    updateItems,
  };
}
