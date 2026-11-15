/* @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const hoisted = vi.hoisted(() => ({
  spacesProps: undefined as undefined | Record<string, unknown>,
  filesProps: undefined as undefined | Record<string, unknown>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue ?? key,
    i18n: {
      resolvedLanguage: 'en-US',
      language: 'en-US',
      on: vi.fn(),
      off: vi.fn(),
    },
  }),
}));

vi.mock('sdkwork-drive-pc-commons', () => ({
  LanguageProvider: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@sdkwork/cloudroutes-pc-commons/runtime', () => ({
  getLoadErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('@sdkwork/cloudroutes-pc-commons', () => ({
  AdminResourceCenter: () => null,
}));

vi.mock('sdkwork-drive-pc-admin-storage-providers', () => ({
  StorageObjectBrowser: () => null,
  StorageProviderEditor: () => null,
  StorageBindingsAdminPage: () => null,
  StorageOverviewAdminPage: () => null,
  StorageProviderKindsAdminPage: () => null,
  providerDisplayName: (_translate: unknown, provider: { displayName?: string; id?: string }) =>
    provider.displayName ?? provider.id ?? '',
  createStorageProviderAdminService: () => ({
    listProviders: vi.fn().mockResolvedValue([]),
    listAllProviders: vi.fn().mockResolvedValue([]),
    updateProvider: vi.fn(),
  }),
}));

vi.mock('sdkwork-drive-pc-admin-operations', async () => {
  const React = await import('react');
  return {
    SpacesAdminPage: (props: Record<string, unknown>) => {
      hoisted.spacesProps = props;
      return React.createElement('div', { 'data-testid': 'spaces-page' }, 'spaces');
    },
    FilesAdminPage: (props: Record<string, unknown>) => {
      hoisted.filesProps = props;
      return React.createElement('div', { 'data-testid': 'files-page' }, 'files');
    },
  };
});

vi.mock('../storageService', () => ({
  backendStorageProvidersList: vi.fn().mockResolvedValue([]),
  backendStorageProviderCreate: vi.fn(),
  backendStorageProviderUpdate: vi.fn(),
  backendStorageProviderDelete: vi.fn(),
  backendStorageProviderHealthCheck: vi.fn(),
  backendStorageProviderRotateCredential: vi.fn(),
  backendStorageProviderAccountsList: vi.fn().mockResolvedValue([]),
  backendStorageProviderAccountsPage: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
  backendStorageProviderAccountCreate: vi.fn(),
  getStorageProviderAdminService: () => ({
    listProviders: vi.fn().mockResolvedValue([]),
    listAllProviders: vi.fn().mockResolvedValue([]),
    updateProvider: vi.fn(),
  }),
  getDriveAdminStorageSdkClient: () => ({ request: vi.fn() }),
  backendStorageInitializeProviderDefaults: vi.fn().mockResolvedValue([]),
  backendStorageDefaultBucketsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageDefaultBucketUpdate: vi.fn(),
  backendStorageGarbageCollectionJobsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageGarbageCollectionJobCreate: vi.fn(),
  backendStorageQuotasList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageQuotaCreate: vi.fn(),
  backendStorageReconciliationRunsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageReconciliationRunCreate: vi.fn(),
  backendStorageUsageList: vi.fn().mockResolvedValue({ items: [] }),
  getDriveAdminBackendSdkClient: () => ({ request: vi.fn() }),
  getDriveAdminSession: () => () => ({}),
}));

import { StorageAdmin } from '../index';

describe('storage center workspace governance', () => {
  it('renders drive space governance and hands the selected space to the file list', async () => {
    const onSectionChange = vi.fn();

    const { rerender } = render(
      <StorageAdmin sectionId="spaces" onSectionChange={onSectionChange} />,
    );

    expect(await screen.findByTestId('spaces-page')).toBeTruthy();
    expect(screen.getByText('Space Management')).toBeTruthy();
    // The drive page receives a drive backend client and a session getter; it
    // owns the request shape and the rendering.
    expect(hoisted.spacesProps?.backendSdkClient).toBeTruthy();
    expect(typeof hoisted.spacesProps?.getSession).toBe('function');
    expect(typeof hoisted.spacesProps?.onOpenFiles).toBe('function');

    act(() => {
      (hoisted.spacesProps?.onOpenFiles as (space: { id: string }) => void)({ id: 'space-001' });
    });
    expect(onSectionChange).toHaveBeenCalledWith('files');

    rerender(<StorageAdmin sectionId="files" onSectionChange={onSectionChange} />);

    expect(await screen.findByTestId('files-page')).toBeTruthy();
    expect(screen.getByText('File Management')).toBeTruthy();
    // The selected space survives the section change as the file list's
    // initial filter instead of being dropped and re-typed.
    expect(hoisted.filesProps?.initialSpaceId).toBe('space-001');
    expect(typeof hoisted.filesProps?.getSession).toBe('function');

    cleanup();
  });

  it('renders the file list without a preselected space when opened from the menu', async () => {
    render(<StorageAdmin sectionId="files" />);

    expect(await screen.findByTestId('files-page')).toBeTruthy();
    expect(hoisted.filesProps?.initialSpaceId).toBeUndefined();
  });
});
