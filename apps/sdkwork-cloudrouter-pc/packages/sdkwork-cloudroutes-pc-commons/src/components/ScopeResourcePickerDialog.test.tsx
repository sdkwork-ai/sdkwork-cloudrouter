// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ScopeResourcePickerDialog,
  type ScopeResourcePickerItem,
  type ScopeResourcePickerLabels,
  type ScopeResourcePickerSource,
} from './ScopeResourcePickerDialog';

const labels: ScopeResourcePickerLabels = {
  title: 'Pick an account',
  description: 'Choose by ownership scope',
  searchPlaceholder: 'Search',
  loading: 'Loading',
  empty: 'Nothing here',
  emptySearch: 'No match',
  error: 'Failed',
  retry: 'Retry',
  cancel: 'Cancel',
  confirm: 'Confirm',
  loadMore: 'Load more',
  scopeLabel: 'Ownership',
  listLabel: 'Accounts',
  close: 'Close',
  selectedCount: (count) => `${count} selected`,
};

function item(id: string, scope: "personal" | "organization" | "tenant", label: string): ScopeResourcePickerItem {
  return { id, scope, label };
}

function source(
  scope: "personal" | "organization" | "tenant",
  items: readonly ScopeResourcePickerItem[],
): ScopeResourcePickerSource {
  return {
    scope,
    label: scope,
    load: vi.fn(async ({ search }) => ({
      items: items.filter((entry) => !search || entry.label.toLowerCase().includes(search.toLowerCase())),
      hasMore: false,
    })),
  };
}

afterEach(cleanup);

describe('ScopeResourcePickerDialog', () => {
  it('defaults to single selection and confirms one item', async () => {
    const personal = item('acc-1', 'personal', 'Personal account');
    const tenant = item('acc-2', 'tenant', 'Tenant account');
    const onConfirm = vi.fn();
    render(
      <ScopeResourcePickerDialog
        initialSelection={[]}
        labels={labels}
        onConfirm={onConfirm}
        onOpenChange={() => undefined}
        open
        sources={[source('personal', [personal]), source('tenant', [tenant])]}
      />,
    );

    expect(await screen.findByRole('option', { name: /Personal account/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();

    fireEvent.click(screen.getByRole('option', { name: /Personal account/ }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledWith([personal]);
  });

  it('keeps multiple selections across scope tabs', async () => {
    const personal = item('acc-1', 'personal', 'Personal account');
    const tenant = item('acc-2', 'tenant', 'Tenant account');
    const onConfirm = vi.fn();
    render(
      <ScopeResourcePickerDialog
        initialSelection={[]}
        labels={labels}
        mode="multiple"
        onConfirm={onConfirm}
        onOpenChange={() => undefined}
        open
        sources={[source('personal', [personal]), source('tenant', [tenant])]}
      />,
    );

    fireEvent.click(await screen.findByRole('option', { name: /Personal account/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'tenant' }));
    fireEvent.click(await screen.findByRole('option', { name: /Tenant account/ }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledWith([personal, tenant]);
  });

  it('starts on the initial selection scope and searches server-side', async () => {
    const tenant = item('acc-2', 'tenant', 'Tenant account');
    const personalSource = source('personal', []);
    const tenantSource = source('tenant', [tenant]);
    render(
      <ScopeResourcePickerDialog
        initialSelection={[tenant]}
        labels={labels}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
        open
        searchDebounceMs={0}
        sources={[personalSource, tenantSource]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'tenant' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'acme' } });
    await waitFor(() => expect(tenantSource.load).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'acme' }),
    ));
  });

  it('shows the scope-specific empty state', async () => {
    render(
      <ScopeResourcePickerDialog
        initialSelection={[]}
        labels={labels}
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
        open
        sources={[source('personal', []), source('tenant', [])]}
      />,
    );

    expect(await screen.findByText('Nothing here')).toBeInTheDocument();
  });
});
