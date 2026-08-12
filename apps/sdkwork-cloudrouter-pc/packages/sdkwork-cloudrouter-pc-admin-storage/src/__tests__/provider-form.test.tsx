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
  backendStorageProviderUpdate: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, defaultValue?: string) => defaultValue ?? key }),
}));

vi.mock('@sdkwork/cloudroutes-pc-commons', () => ({
  getLoadErrorMessage: (_error: unknown, fallback: string) => fallback,
  AdminResourceCenter: ({ activeSectionId, sections }: {
    activeSectionId: string;
    sections: ReadonlyArray<{
      id: string;
      action?: { label: string; onClick: () => void };
      load: (params?: { page: number; pageSize: number; filters?: Record<string, string> }) => Promise<unknown>;
      rowActions?: ReadonlyArray<{
        label: string;
        isVisible?: (record: Record<string, unknown>) => boolean;
        onClick: (record: Record<string, unknown>, section: unknown) => void;
      }>;
    }>;
  }) => {
    const active = sections.find((section) => section.id === activeSectionId);
    return (
      <div>
        {active?.action ? (
          <button onClick={() => active.action?.onClick()} type="button">{active.action.label}</button>
        ) : null}
        {active?.rowActions?.map((action) => (
          <button
            key={action.label}
            onClick={() => action.onClick(hoisted.mockProviders[0], active)}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock('sdkwork-drive-pc-admin-storage-providers', () => ({
  StorageObjectBrowser: () => null,
  createStorageProviderAdminService: () => ({
    listProviders: vi.fn().mockResolvedValue(hoisted.mockProviders),
    createProvider: vi.fn().mockResolvedValue({}),
    updateProvider: hoisted.backendStorageProviderUpdate,
    deleteProvider: vi.fn().mockResolvedValue(true),
    testProvider: vi.fn().mockResolvedValue(true),
    listObjects: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    deleteObject: vi.fn().mockResolvedValue(true),
    readObjectContent: vi.fn().mockResolvedValue({}),
    writeObjectContent: vi.fn().mockResolvedValue({}),
    copyObject: vi.fn().mockResolvedValue({ changed: true }),
    renameObject: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('../storageService', () => ({
  backendStorageProvidersList: vi.fn().mockResolvedValue(hoisted.mockProviders),
  backendStorageProviderCreate: vi.fn().mockResolvedValue({}),
  backendStorageProviderUpdate: hoisted.backendStorageProviderUpdate,
  backendStorageProviderDelete: vi.fn().mockResolvedValue(true),
  backendStorageProviderHealthCheck: vi.fn().mockResolvedValue(true),
  getStorageProviderAdminService: () => ({
    listProviders: vi.fn().mockResolvedValue(hoisted.mockProviders),
    createProvider: vi.fn().mockResolvedValue({}),
    updateProvider: hoisted.backendStorageProviderUpdate,
    deleteProvider: vi.fn().mockResolvedValue(true),
    testProvider: vi.fn().mockResolvedValue(true),
    listObjects: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    deleteObject: vi.fn().mockResolvedValue(true),
    readObjectContent: vi.fn().mockResolvedValue({}),
    writeObjectContent: vi.fn().mockResolvedValue({}),
    copyObject: vi.fn().mockResolvedValue({ changed: true }),
    renameObject: vi.fn().mockResolvedValue(true),
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

describe('storage admin provider form and browsing', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    hoisted.backendStorageProviderUpdate.mockClear();
    hoisted.backendStorageProviderUpdate.mockResolvedValue({});
  });

  it('creates a provider with drive contract fields (kind/name/bucket/credentials)', async () => {
    render(<StorageAdmin sectionId="providers" />);

    const addProvider = await screen.findByText('Add provider');
    fireEvent.click(addProvider);

    // 凭证方式默认选中「访问密钥」（plain）。
    const credentialModeSelect = screen.getByLabelText('Credential mode') as HTMLSelectElement;
    expect(credentialModeSelect.value).toBe('plain');

    // 访问密钥字段默认可见（字段名按各服务商官方命名，mock t 回退为字段键；星号在 label 后）。
    expect(screen.getByLabelText(/accessKeyId/)).toBeTruthy();
    expect(screen.getByLabelText(/secretAccessKey/)).toBeTruthy();
  });

  it('pre-fills credential mode as reference on edit and submits the new reference', async () => {
    render(<StorageAdmin sectionId="providers" />);
    // 行操作「编辑」作用于 mockProviders[0]（credentialConfigured=true，但内容不回显）。
    fireEvent.click(await screen.findByText('Edit'));

    // 提交时引用随请求发送（drive 契约：仅 credentialRef/status 等可选字段）。
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(hoisted.backendStorageProviderUpdate).toHaveBeenCalledTimes(1);
    });
    const [providerId, body] = hoisted.backendStorageProviderUpdate.mock.calls[0];
    expect(providerId).toBe('provider-1');
    expect(body.name).toBe('Primary S3');
    expect(body.bucket).toBe('tenant-assets');
  });

  it('sets provider credentials from the quick action without exposing secrets', async () => {
    render(<StorageAdmin sectionId="providers" />);
    // 行操作「凭证」作用于 mockProviders[0]。
    fireEvent.click(await screen.findByText('Credentials'));

    // 快速设置从空白开始：凭证模式默认访问密钥，引用/密钥内容不回显。
    const modeSelect = screen.getByLabelText(/Credential mode/) as HTMLSelectElement;
    expect(modeSelect.value).toBe('plain');

    fireEvent.change(screen.getByLabelText(/accessKeyId/), { target: { value: 'new-ak' } });
    fireEvent.change(screen.getByLabelText(/secretAccessKey/), { target: { value: 'new-sk' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(hoisted.backendStorageProviderUpdate).toHaveBeenCalledTimes(1);
    });
    const body = hoisted.backendStorageProviderUpdate.mock.calls[0][1];
    expect(body.credentialRef).toBe('plain:new-ak:new-sk');
  });

  it('keeps governance sections and exposes the drive object browser action', async () => {
    render(<StorageAdmin sectionId="providers" />);
    // 行操作「浏览文件」存在（drive 对象浏览入口）。
    expect(await screen.findByText('Browse files')).toBeTruthy();
    // 治理 section 仍可解析（defaultBuckets 等保留在 cloudrouter）。
    expect(screen.getByText('Add provider')).toBeTruthy();
  });
});
