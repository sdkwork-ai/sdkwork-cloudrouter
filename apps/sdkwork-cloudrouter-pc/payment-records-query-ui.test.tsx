/**
 * Behavioural contract for the record-query controls in `AdminResourceCenter`.
 *
 * The payment record console depends on three promises from the shared center:
 * filters reach `load` as server parameters, the search box runs server-side
 * (so it is not limited to the loaded page), and any filter change resets the
 * page index to 1. A regression here silently shows the wrong slice of records.
 */
// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AdminResourceCenter,
  type AdminResourceLoadParams,
  type AdminResourceSection,
} from './packages/sdkwork-cloudroutes-pc-commons/src/components/AdminResourceCenter';

type TestSectionId = 'records';

function buildSection(load: (params?: AdminResourceLoadParams) => Promise<unknown>): AdminResourceSection<TestSectionId, string> {
  return {
    id: 'records',
    title: 'Records',
    description: 'Record list',
    icon: null,
    group: 'Runtime',
    searchMode: 'server',
    load,
    searchFields: [],
    filters: [
      {
        key: 'status',
        label: 'Status',
        placeholder: 'All statuses',
        options: [
          { value: 'succeeded', label: 'Succeeded' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      {
        key: 'currencyCode',
        kind: 'text',
        label: 'Currency',
        placeholder: 'Currency (e.g. CNY)',
        maxLength: 3,
      },
    ],
    columns: [{ key: 'id', label: 'ID' }],
    rowActions: [],
    pagination: { initialPageSize: 20, pageSizeOptions: [20, 50] },
  };
}

function lastParams(load: ReturnType<typeof vi.fn>): AdminResourceLoadParams | undefined {
  const calls = load.mock.calls;
  const last = calls[calls.length - 1];
  return last?.[0] as AdminResourceLoadParams | undefined;
}

afterEach(() => {
  cleanup();
});

describe('AdminResourceCenter record query controls', () => {
  it('forwards select filters, debounced text filters, and server search to load', async () => {
    const load = vi.fn(async () => ({
      items: [],
      pageInfo: { page: 1, pageSize: 20, totalItems: 100, totalPages: 5 },
    }));
    render(
      <AdminResourceCenter
        activeSectionId="records"
        clearFiltersLabel="Clear filters"
        sections={[buildSection(load)]}
        showSectionNavigation={false}
      />,
    );

    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(lastParams(load)).toMatchObject({
      page: 1,
      pageSize: 20,
      filters: { status: '', currencyCode: '' },
    });
    // 服务端搜索模式下初始查询不应带搜索词。
    expect(lastParams(load)?.search).toBeUndefined();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'succeeded' } });
    await waitFor(() => expect(lastParams(load)?.filters?.status).toBe('succeeded'));

    fireEvent.change(screen.getByPlaceholderText('Search records'), { target: { value: '  PI-1001  ' } });
    await waitFor(() => expect(lastParams(load)?.search).toBe('PI-1001'));

    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'CNY' } });
    await waitFor(() => expect(lastParams(load)?.filters?.currencyCode).toBe('CNY'));

    fireEvent.click(screen.getByText('Clear filters'));
    await waitFor(() => {
      const params = lastParams(load);
      expect(params?.search).toBeUndefined();
      expect(params?.filters).toEqual({ status: '', currencyCode: '' });
    });
  });

  it('returns to the first page whenever a filter changes', async () => {
    const load = vi.fn(async (params?: AdminResourceLoadParams) => ({
      items: [{ id: `${params?.page ?? 1}` }],
      pageInfo: { page: params?.page ?? 1, pageSize: 20, totalItems: 100, totalPages: 5 },
    }));
    render(
      <AdminResourceCenter activeSectionId="records" sections={[buildSection(load)]} showSectionNavigation={false} />,
    );

    await waitFor(() => expect(load).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() => expect(lastParams(load)?.page).toBe(2));

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
    await waitFor(() => {
      const params = lastParams(load);
      expect(params?.page).toBe(1);
      expect(params?.filters?.status).toBe('failed');
    });
  });
});
