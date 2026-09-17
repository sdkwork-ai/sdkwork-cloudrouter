import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const hoisted = vi.hoisted(() => ({
  mockProviders: [
    {
      id: 'provider-1',
      providerKind: 's3_compatible',
      displayName: 'Primary S3',
      endpointUrl: 'https://s3.us-east-1.amazonaws.com',
      region: 'us-east-1',
      bucket: 'tenant-assets',
      pathStyle: false,
      strictTls: true,
      credentialConfigured: true,
      status: 'active',
      version: 1,
    },
    {
      id: 'provider-2',
      providerKind: 'aliyun_oss',
      displayName: 'Aliyun OSS',
      endpointUrl: 'https://oss-cn-hangzhou.aliyuncs.com',
      region: 'cn-hangzhou',
      bucket: 'archive-bucket',
      pathStyle: false,
      strictTls: true,
      credentialConfigured: false,
      status: 'active',
      version: 1,
    },
  ],
  services: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    healthCheck: vi.fn(),
    rotateCredential: vi.fn(),
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
  },
  /** 最近一次渲染时注入共享编辑器的全部 props（断言接线用）。 */
  editorProps: undefined as undefined | Record<string, unknown>,
  /** 最近一次渲染时拿到的 resource-center 区段定义（用于直接跑 load）。 */
  sections: [] as ReadonlyArray<Record<string, unknown>>,
}));

// `i18n` is what `DriveLanguageBridge` reads to mirror the console language into
// drive's own language context.
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
  // Pass-through: the bridge only supplies a language context, so the mocked
  // provider must still render the console underneath it.
  LanguageProvider: ({ children }: { children?: unknown }) => children,
}));

/**
 * `@sdkwork/cloudroutes-pc-commons` pulls every sibling app's generated backend
 * SDK (membership / community / models / prompts …). Those build artifacts are
 * cross-repo and are absent here, so the module graph cannot be loaded at all —
 * which is a property of this checkout, not of the code under test. Both
 * specifiers are therefore stubbed: the package only uses `AdminResourceCenter`
 * (rendering) and `getLoadErrorMessage` (error text), and neither is what this
 * suite is about.
 */
vi.mock('@sdkwork/cloudroutes-pc-commons/runtime', () => ({
  getLoadErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('@sdkwork/cloudroutes-pc-commons', async () => {
  const React = await import('react');
  const h = React.createElement;
  return {
    AdminResourceCenter: ({ activeSectionId, sections }: {
      activeSectionId: string;
      sections: ReadonlyArray<{
        id: string;
        action?: { label: string; onClick: () => void };
        load: (params?: { page: number; pageSize: number }) => Promise<unknown>;
        rowActions?: ReadonlyArray<{
          label: string;
          isVisible?: (record: Record<string, unknown>) => boolean;
          onClick: (record: Record<string, unknown>, section: unknown) => void;
        }>;
      }>;
    }) => {
      hoisted.sections = sections;
      const active = sections.find((section) => section.id === activeSectionId);
      // The real centre loads the active section on mount; emulating that keeps
      // the "already taken provider ids" hand-off exercised the same way.
      React.useEffect(() => {
        void active?.load?.({ page: 1, pageSize: 20 });
      }, [active]);
      return h(
        'div',
        null,
        active?.action
          ? h('button', { type: 'button', onClick: () => active.action?.onClick() }, active.action.label)
          : null,
        (active?.rowActions ?? [])
          .filter((action) => (action.isVisible ? action.isVisible(hoisted.mockProviders[0]) : true))
          .map((action) => h(
            'button',
            {
              key: action.label,
              type: 'button',
              onClick: () => action.onClick(hoisted.mockProviders[0], active),
            },
            action.label,
          )),
      );
    },
  };
});

/**
 * Stand-in for drive's editor. What this suite guards is not the editor's own
 * layout — drive owns that — but *what cloudrouter injects into it*: the drive
 * view it is handed, the service门面 it calls back into, and above all the
 * account-centre callbacks whose presence is what makes "reuse one cloud
 * account across resources" reachable from the storage console at all.
 */
vi.mock('sdkwork-drive-pc-admin-storage-providers', async () => {
  const React = await import('react');
  const h = React.createElement;
  return {
    StorageObjectBrowser: () => null,
    StorageProviderEditor: (props: Record<string, unknown>) => {
      hoisted.editorProps = props;
      const provider = props.provider as { id: string } | undefined;
      const ids = (props.existingProviderIds as readonly string[] | undefined) ?? [];
      const button = (label: string, onClick: () => void) =>
        h('button', { key: label, type: 'button', onClick }, label);
      return h(
        'div',
        { 'data-testid': 'shared-provider-editor' },
        h('span', { 'data-testid': 'editor-mode' }, provider ? `editing:${provider.id}` : 'creating'),
        h('span', { 'data-testid': 'editor-known-ids' }, ids.join(',')),
        button('list-accounts', () => {
          void (props.onListProviderAccounts as ((input: unknown) => Promise<unknown>) | undefined)?.({ status: 'active' });
        }),
        button('create-account', () => {
          void (props.onCreateProviderAccount as ((input: unknown) => Promise<unknown>) | undefined)?.(
            { vendorCode: 'aliyun', accountCode: 'shared-aliyun', displayName: 'Shared Aliyun' },
          );
        }),
        button('save-provider', () => {
          void (props.onUpdateProvider as ((id: string, input: unknown) => Promise<unknown>) | undefined)?.(
            provider?.id ?? '',
            { bucket: 'next-bucket' },
          );
        }),
        button('create-provider', () => {
          void (props.onCreateProvider as ((input: unknown) => Promise<unknown>) | undefined)?.(
            { id: 'new-provider', providerKind: 's3_compatible', name: 'New', bucket: 'b' },
          );
        }),
        button('rotate-credential', () => {
          void (props.onRotateCredential as ((id: string, ref: string) => Promise<unknown>) | undefined)?.(
            provider?.id ?? '',
            'plain:new-ak:new-sk',
          );
        }),
        button('notify-saved', () => {
          (props.onProviderSaved as ((saved: unknown) => void) | undefined)?.({
            id: provider?.id ?? 'created',
            providerKind: 's3_compatible',
            displayName: 'Saved',
            bucket: 'b',
            credentialConfigured: true,
            status: 'active',
            version: 2,
          });
        }),
        button('close-editor', () => (props.onClose as () => void)()),
      );
    },
    createStorageProviderAdminService: () => ({
      listProviders: vi.fn().mockResolvedValue(hoisted.mockProviders),
      updateProvider: hoisted.services.update,
    }),
  };
});

vi.mock('../storageService', () => ({
  backendStorageProvidersList: vi.fn().mockResolvedValue(hoisted.mockProviders),
  backendStorageProviderCreate: hoisted.services.create,
  backendStorageProviderUpdate: hoisted.services.update,
  backendStorageProviderDelete: hoisted.services.remove,
  backendStorageProviderHealthCheck: hoisted.services.healthCheck,
  // Account centre + credential rotation: the two surfaces the storage console
  // gained by converging onto the shared editor.
  backendStorageProviderRotateCredential: hoisted.services.rotateCredential,
  backendStorageProviderAccountsList: hoisted.services.listAccounts,
  backendStorageProviderAccountCreate: hoisted.services.createAccount,
  getStorageProviderAdminService: () => ({
    listProviders: vi.fn().mockResolvedValue(hoisted.mockProviders),
    updateProvider: hoisted.services.update,
  }),
  backendStorageDefaultBucketsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageDefaultBucketUpdate: vi.fn().mockResolvedValue({}),
  backendStorageGarbageCollectionJobsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageGarbageCollectionJobCreate: vi.fn().mockResolvedValue({}),
  backendStorageQuotasList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageQuotaCreate: vi.fn().mockResolvedValue({}),
  backendStorageReconciliationRunsList: vi.fn().mockResolvedValue({ items: [] }),
  backendStorageReconciliationRunCreate: vi.fn().mockResolvedValue({}),
  backendStorageUsageList: vi.fn().mockResolvedValue({ items: [] }),
}));

import { StorageAdmin } from '../index';

/** 编辑器 props 的读取助手：省略重复的类型断言。 */
function editorProp<T>(key: string): T {
  return hoisted.editorProps?.[key] as T;
}

describe('storage admin provider section wired to the shared drive editor', () => {
  afterEach(() => {
    cleanup();
    hoisted.editorProps = undefined;
    hoisted.sections = [];
  });

  beforeEach(() => {
    for (const fn of Object.values(hoisted.services)) {
      fn.mockReset();
    }
    hoisted.services.update.mockResolvedValue({});
    hoisted.services.rotateCredential.mockResolvedValue({});
    hoisted.services.createAccount.mockResolvedValue({ id: 'account-1' });
    hoisted.services.listAccounts.mockResolvedValue([{ id: 'account-1', displayName: 'Shared Aliyun' }]);
  });

  it('renders the provider section through the shared editor instead of a local form', async () => {
    render(<StorageAdmin sectionId="providers" />);

    fireEvent.click(await screen.findByText('Add provider'));

    expect(await screen.findByTestId('shared-provider-editor')).toBeTruthy();
    expect(screen.getByTestId('editor-mode').textContent).toBe('creating');
    // The divergent credential UI is gone for good: neither the mode switch nor
    // its access-key inputs survive anywhere in the console.
    expect(screen.queryByText('Credential mode')).toBeNull();
    expect(screen.queryByLabelText(/accessKeyId/)).toBeNull();
    expect(screen.queryByText('Credentials')).toBeNull();
  });

  it('hands the drive view and the already-taken ids to the shared editor', async () => {
    render(<StorageAdmin sectionId="providers" />);

    fireEvent.click(await screen.findByText('Edit'));

    // The row action passed a resource record; the editor must receive the drive
    // contract view, not the console's own projection of it.
    await waitFor(() => {
      expect(screen.getByTestId('editor-mode').textContent).toBe('editing:provider-1');
    });
    const provider = editorProp<{ providerKind: string; bucket: string }>('provider');
    expect(provider.providerKind).toBe('s3_compatible');
    expect(provider.bucket).toBe('tenant-assets');
    // Both listed ids were captured by the section loader, so a new provider
    // cannot be generated with an id already on screen.
    await waitFor(() => {
      expect(editorProp<readonly string[]>('existingProviderIds')).toEqual(['provider-1', 'provider-2']);
    });
  });

  it('maps the shared provider view onto the columns and search keys the table declares', async () => {
    render(<StorageAdmin sectionId="providers" />);
    await screen.findByText('Add provider');

    const providerSection = hoisted.sections.find((section) => section.id === 'providers') as {
      columns: ReadonlyArray<{ key: string }>;
      searchFields: readonly string[];
      load: () => Promise<ReadonlyArray<Record<string, unknown>>>;
    };
    const records = await providerSection.load();

    // The console's columns read `name` / `providerType`; the drive view calls the
    // same values `displayName` / `providerKind`. If the alias ever disappears the
    // Name and Type columns silently render blank, so it is asserted here.
    expect(providerSection.columns.map((column) => column.key)).toContain('name');
    expect(providerSection.columns.map((column) => column.key)).toContain('providerType');
    expect(providerSection.searchFields).toContain('name');
    expect(records[0]).toMatchObject({
      id: 'provider-1',
      name: 'Primary S3',
      providerType: 's3_compatible',
      displayName: 'Primary S3',
      providerKind: 's3_compatible',
      bucket: 'tenant-assets',
    });
  });

  it('injects the account-centre callbacks so a provider can reuse an existing cloud account', async () => {
    render(<StorageAdmin sectionId="providers" />);
    fireEvent.click(await screen.findByText('Edit'));
    await screen.findByTestId('shared-provider-editor');

    // Without these two callbacks the editor falls back to manual refs only, and
    // "one account reused across resources" stops being reachable from here.
    expect(typeof editorProp<unknown>('onListProviderAccounts')).toBe('function');
    expect(typeof editorProp<unknown>('onCreateProviderAccount')).toBe('function');

    fireEvent.click(screen.getByText('list-accounts'));
    await waitFor(() => {
      expect(hoisted.services.listAccounts).toHaveBeenCalledWith({ status: 'active' });
    });

    fireEvent.click(screen.getByText('create-account'));
    await waitFor(() => {
      expect(hoisted.services.createAccount).toHaveBeenCalledWith({
        vendorCode: 'aliyun',
        accountCode: 'shared-aliyun',
        displayName: 'Shared Aliyun',
      });
    });
  });

  it('routes save, rotate and create through the drive service alone', async () => {
    render(<StorageAdmin sectionId="providers" />);
    fireEvent.click(await screen.findByText('Edit'));
    await screen.findByTestId('shared-provider-editor');

    fireEvent.click(screen.getByText('save-provider'));
    await waitFor(() => {
      expect(hoisted.services.update).toHaveBeenCalledWith('provider-1', { bucket: 'next-bucket' });
    });

    fireEvent.click(screen.getByText('rotate-credential'));
    await waitFor(() => {
      expect(hoisted.services.rotateCredential).toHaveBeenCalledWith('provider-1', 'plain:new-ak:new-sk');
    });

    fireEvent.click(screen.getByText('create-provider'));
    await waitFor(() => {
      expect(hoisted.services.create).toHaveBeenCalledWith({
        id: 'new-provider',
        providerKind: 's3_compatible',
        name: 'New',
        bucket: 'b',
      });
    });
  });

  it('closes the shared editor from its own close handler', async () => {
    render(<StorageAdmin sectionId="providers" />);
    fireEvent.click(await screen.findByText('Edit'));
    await screen.findByTestId('shared-provider-editor');

    fireEvent.click(screen.getByText('notify-saved'));
    fireEvent.click(screen.getByText('close-editor'));

    await waitFor(() => {
      expect(screen.queryByTestId('shared-provider-editor')).toBeNull();
    });
  });

  it('keeps the governance sections and the drive object-browser entry point', async () => {
    render(<StorageAdmin sectionId="providers" />);

    expect(await screen.findByText('Browse files')).toBeTruthy();
    expect(screen.getByText('Add provider')).toBeTruthy();
    expect(hoisted.sections.map((section) => section.id)).toEqual([
      'providers',
      'defaultBuckets',
      'quotas',
      'usage',
      'reconciliation',
      'garbageCollection',
    ]);
  });
});
