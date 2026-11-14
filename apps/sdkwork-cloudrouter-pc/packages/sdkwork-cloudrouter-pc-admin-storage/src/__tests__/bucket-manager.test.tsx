/* @vitest-environment jsdom */

/**
 * Bucket management is the Cloud Router surface over drive's admin-storage
 * service. These tests pin the contract that matters commercially:
 *
 * 1. The provider list is read through `listAllProviders`, not the 20-row page
 *    that used to hide Tencent COS;
 * 2. switching the configured bucket writes through `updateProvider` and then
 *    verifies the bucket on the vendor (`initializeBucket`);
 * 3. the object browser is only offered for the configured bucket.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const hoisted = vi.hoisted(() => ({
  calls: [] as string[],
  service: {
    listAllProviders: vi.fn(),
    listBuckets: vi.fn(),
    updateProvider: vi.fn(),
    initializeBucket: vi.fn(),
    headBucket: vi.fn(),
    deleteBucket: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, options?: Record<string, unknown>) => {
      const template = defaultValue ?? key;
      if (!options) return template;
      return Object.entries(options).reduce(
        (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
        template,
      );
    },
    i18n: { resolvedLanguage: 'en-US', language: 'en-US' },
  }),
}));

vi.mock('sdkwork-drive-pc-admin-storage-providers', () => ({
  StorageObjectBrowser: ({ provider }: { provider: { id: string } }) =>
    `browser:${provider.id}` as unknown as ReactNode,
  providerDisplayName: (_translate: unknown, provider: { displayName?: string; id?: string }) =>
    provider.displayName ?? provider.id ?? '',
}));

import { BucketManagerSection } from '../buckets/BucketManagerSection';
import type { StorageProviderAdminService } from 'sdkwork-drive-pc-admin-storage-providers';

const providers = [
  {
    id: 'provider-cos',
    providerKind: 'tencent_cos',
    displayName: 'Built-in Tencent Cloud COS',
    endpointUrl: 'https://cos.ap-guangzhou.myqcloud.com',
    region: 'ap-guangzhou',
    bucket: 'sdkwork-drive-cos-1250000000',
    pathStyle: false,
    strictTls: true,
    credentialConfigured: true,
    status: 'active',
    version: 1,
  },
  {
    id: 'provider-s3',
    providerKind: 's3_compatible',
    displayName: 'Built-in Amazon S3',
    endpointUrl: 'https://s3.us-east-1.amazonaws.com',
    region: 'us-east-1',
    bucket: 'sdkwork-drive-s3-compatible',
    pathStyle: true,
    strictTls: true,
    credentialConfigured: true,
    status: 'active',
    version: 1,
  },
];

const buckets = [
  {
    bucket: 'sdkwork-drive-cos-1250000000',
    configured: true,
    region: 'ap-guangzhou',
    creationDateIso: '2026-01-02T03:04:05.000Z',
  },
  {
    bucket: 'sdkwork-drive-cos-archive',
    configured: false,
    region: 'ap-guangzhou',
    creationDateIso: '2026-01-03T03:04:05.000Z',
  },
];

function service(): StorageProviderAdminService {
  return {
    listAllProviders: hoisted.service.listAllProviders,
    listBuckets: hoisted.service.listBuckets,
    updateProvider: hoisted.service.updateProvider,
    initializeBucket: hoisted.service.initializeBucket,
    headBucket: hoisted.service.headBucket,
    deleteBucket: hoisted.service.deleteBucket,
  } as unknown as StorageProviderAdminService;
}

describe('BucketManagerSection', () => {
  beforeEach(() => {
    hoisted.service.listAllProviders.mockResolvedValue(providers);
    hoisted.service.listBuckets.mockResolvedValue(buckets);
    hoisted.service.updateProvider.mockResolvedValue(providers[0]);
    hoisted.service.initializeBucket.mockResolvedValue({
      providerId: 'provider-cos',
      bucket: 'sdkwork-drive-cos-archive',
      changed: false,
    });
    hoisted.service.headBucket.mockResolvedValue({
      providerId: 'provider-cos',
      bucket: 'sdkwork-drive-cos-1250000000',
      exists: true,
    });
    hoisted.service.deleteBucket.mockResolvedValue(true);
  });

  it('lists every provider through listAllProviders and shows account buckets', async () => {
    render(
      <BucketManagerSection
        service={service()}
        renderObjectBrowser={() => <div data-testid="object-browser" />}
      />,
    );

    expect(await screen.findByText('sdkwork-drive-cos-1250000000')).toBeTruthy();
    expect(await screen.findByText('sdkwork-drive-cos-archive')).toBeTruthy();
    expect(hoisted.service.listAllProviders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
    // The configured bucket is labelled; the other one is offered for use.
    expect(screen.getByText('Configured')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Use this bucket')).toBeTruthy();
    cleanup();
  });

  it('switches the configured bucket through the shared service and re-verifies it', async () => {
    render(
      <BucketManagerSection
        service={service()}
        renderObjectBrowser={() => <div data-testid="object-browser" />}
      />,
    );

    fireEvent.click(await screen.findByText('Use this bucket'));

    await waitFor(() => {
      expect(hoisted.service.updateProvider).toHaveBeenCalledWith(
        'provider-cos',
        { bucket: 'sdkwork-drive-cos-archive' },
      );
    });
    expect(hoisted.service.initializeBucket).toHaveBeenCalledWith('provider-cos');
    cleanup();
  });

  it('offers object browsing only for the configured bucket', async () => {
    render(
      <BucketManagerSection
        service={service()}
        renderObjectBrowser={(provider) => <div data-testid="object-browser">{provider.bucket}</div>}
      />,
    );

    const browseButtons = await screen.findAllByText('Browse files');
    expect(browseButtons).toHaveLength(2);
    expect((browseButtons[0] as HTMLButtonElement).disabled).toBe(false);
    expect((browseButtons[1] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(browseButtons[0]!);
    expect(await screen.findByTestId('object-browser')).toBeTruthy();
    cleanup();
  });

  it('reports an empty plane when no active provider exists', async () => {
    hoisted.service.listAllProviders.mockResolvedValueOnce([]);

    render(
      <BucketManagerSection
        service={service()}
        renderObjectBrowser={() => <div data-testid="object-browser" />}
      />,
    );

    expect(await screen.findByText('No active storage provider yet.')).toBeTruthy();
    cleanup();
  });
});
