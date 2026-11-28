// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDomainPagedList } from './useDomainPagedList';

beforeEach(() => {
  sessionStorage.clear();
});

function makePage<T>(items: T[], page: number, pageSize: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    items,
    pageInfo: {
      mode: 'offset' as const,
      page,
      pageSize,
      totalItems: String(totalItems),
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

describe('useDomainPagedList', () => {
  it('loads the first page and walks forward one server page at a time', async () => {
    const load = vi.fn(async (page: number, pageSize: number) =>
      makePage([`row-${page}`], page, pageSize, 41));

    const { result } = renderHook(() => useDomainPagedList({ load, queryKey: 'zones' }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalItems).toBe(41);
    expect(result.current.totalPages).toBe(3);
    expect(load).toHaveBeenLastCalledWith(1, 20);

    act(() => result.current.goToNextPage());
    await waitFor(() => expect(result.current.items).toEqual(['row-2']));
    expect(load).toHaveBeenLastCalledWith(2, 20);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.goToPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(3, 20));
    expect(result.current.hasMore).toBe(false);
  });

  it('returns to the first page when the query changes, and when the page size changes', async () => {
    const load = vi.fn(async (page: number, pageSize: number) =>
      makePage([`row-${page}-${pageSize}`], page, pageSize, 200));

    const { result, rerender } = renderHook(
      ({ queryKey }: { queryKey: string }) => useDomainPagedList({ load, queryKey }),
      { initialProps: { queryKey: 'zones|' } },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => result.current.goToPage(4));
    await waitFor(() => expect(result.current.page).toBe(4));

    rerender({ queryKey: 'zones|example.com' });
    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(1, 20));

    act(() => result.current.changePageSize(50));
    await waitFor(() => expect(result.current.pageSize).toBe(50));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(1, 50));
  });

  it('re-queries the last surviving page when the current page disappeared', async () => {
    const load = vi.fn(async (page: number, pageSize: number) =>
      page === 1
        ? makePage(['a', 'b'], 1, pageSize, 21)
        : { items: [], pageInfo: { mode: 'offset' as const, page, pageSize, totalItems: '20', totalPages: 1, hasMore: false } });

    const { result } = renderHook(() => useDomainPagedList({ load, queryKey: 'zones' }));

    await waitFor(() => expect(result.current.totalPages).toBe(2));
    act(() => result.current.goToNextPage());
    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith(1, 20));
    expect(load.mock.calls.filter(([page]) => page === 1).length).toBeGreaterThanOrEqual(2);
  });

  it('never lets a stale response overwrite a newer query', async () => {
    type Page = ReturnType<typeof makePage<string>>;
    let resolveStale: ((value: Page) => void) | undefined;
    let calls = 0;
    const load = vi.fn(async (page: number, pageSize: number): Promise<Page> => {
      calls += 1;
      if (calls === 1) {
        return await new Promise<Page>((resolve) => {
          resolveStale = resolve;
        });
      }
      return makePage(['fresh'], page, pageSize, 1);
    });

    const { result, rerender } = renderHook(
      ({ queryKey }: { queryKey: string }) => useDomainPagedList({ load, queryKey }),
      { initialProps: { queryKey: 'a' } },
    );

    rerender({ queryKey: 'b' });
    await waitFor(() => expect(result.current.items).toEqual(['fresh']));

    await act(async () => {
      resolveStale?.(makePage(['stale'], 1, 20, 1));
      await Promise.resolve();
    });
    expect(result.current.items).toEqual(['fresh']);
  });

  it('does not request anything until it is enabled', async () => {
    const load = vi.fn(async (page: number, pageSize: number) =>
      makePage(['row'], page, pageSize, 1));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDomainPagedList({ load, queryKey: 'zone-a', enabled }),
      { initialProps: { enabled: false } },
    );

    expect(result.current.status).toBe('idle');
    expect(load).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('remembers the rows-per-page choice across tables and visits', async () => {
    sessionStorage.setItem('sdkwork.cloudrouter.domainCenter.pageSize', '50');
    const load = vi.fn(async (page: number, pageSize: number) =>
      makePage(['row'], page, pageSize, 200));

    const { result } = renderHook(() => useDomainPagedList({ load, queryKey: 'certificates' }));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.pageSize).toBe(50);
    expect(load).toHaveBeenLastCalledWith(1, 50);
  });
});
