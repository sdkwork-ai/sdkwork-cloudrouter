import { describe, expect, it } from 'vitest';
import {
  attachDriveShareToken,
  clearDriveMediaCaches,
  isDriveMediaResource,
  readDriveShareToken,
  resolveDriveMediaUrl,
  uploadResultToDriveMediaResource,
} from './drive-media.ts';
import type { DriveUploaderUploadResult } from '@sdkwork/drive-app-sdk';

const uploadResult: DriveUploaderUploadResult = {
  uploadItem: {
    id: 'upload-item-1',
    taskId: 'task-1',
    actorType: 'user',
    actorId: 'user-1',
    appId: 'sdkwork-cloudrouter',
    appResourceType: 'site-settings',
    appResourceId: 'site-settings-qr-codes',
    uploadProfileCode: 'image',
    fileFingerprint: 'fp-1',
    spaceId: 'space-1',
    nodeId: 'node-1',
    originalFileName: 'qr.png',
    contentType: 'image/png',
    contentTypeGroup: 'image',
    contentLength: '2048',
    chunkSizeBytes: '1048576',
    totalParts: '1',
    uploadedPartsCount: '1',
    uploadedBytes: '2048',
    status: 'completed',
    retentionMode: 'long_term',
    cleanupStatus: 'none',
    postProcessStatus: 'none',
  },
  uploadSession: {
    id: 'session-1',
    spaceId: 'space-1',
    nodeId: 'node-1',
    bucket: 'bucket-1',
    objectKey: 'key-1',
    state: 'completed',
    expiresAtEpochMs: '0',
    version: '1',
    storageProviderId: 'provider-1',
    storageUploadId: 'upload-1',
  },
  parts: [],
};

describe('drive media mapping', () => {
  it('maps an uploader result into a drive-backed MediaResource', () => {
    const media = uploadResultToDriveMediaResource(uploadResult);

    expect(media).toMatchObject({
      id: 'node-1',
      kind: 'image',
      source: 'drive',
      uri: 'drive://spaces/space-1/nodes/node-1',
      fileName: 'qr.png',
      mimeType: 'image/png',
      sizeBytes: '2048',
      metadata: {
        drive: {
          spaceId: 'space-1',
          nodeId: 'node-1',
        },
      },
    });
  });

  it('round-trips the share token through metadata', () => {
    const media = uploadResultToDriveMediaResource(uploadResult);
    expect(readDriveShareToken(media)).toBe('');
    expect(isDriveMediaResource(media)).toBe(true);

    const withToken = attachDriveShareToken(media, 'share-token-abc');
    expect(readDriveShareToken(withToken)).toBe('share-token-abc');
    expect(readDriveShareToken(attachDriveShareToken(withToken, 'token-2'))).toBe('token-2');
  });

  it('does not treat external url media as drive media', () => {
    const external = {
      kind: 'image' as const,
      source: 'external_url' as const,
      url: 'https://example.com/qr.png',
    };
    expect(isDriveMediaResource(external)).toBe(false);
    expect(readDriveShareToken(external)).toBe('');
  });

  it('resolves external url media directly', async () => {
    const external = {
      kind: 'image' as const,
      source: 'external_url' as const,
      url: 'https://example.com/qr.png',
    };
    await expect(resolveDriveMediaUrl(external)).resolves.toBe('https://example.com/qr.png');
  });

  it('returns empty for drive media without a share token', async () => {
    const media = uploadResultToDriveMediaResource(uploadResult);
    await expect(resolveDriveMediaUrl(media)).resolves.toBe('');
  });

  it('exchanges a persisted reader share token for a download url', async () => {
    // The site logo is stored as a `drive://` reference plus a reader share token: the browser
    // cannot render either one, so every brand surface depends on this exchange. Stubbing the
    // open client is what lets the assertion see the URL the <img> would receive.
    const host = globalThis as typeof globalThis & {
      __SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__?: unknown;
    };
    const original = host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__;

    // Both shapes matter: the generated open client unwraps `{ code, data }` before returning,
    // while its declared response type keeps the envelope. Reading only the envelope is exactly
    // what made an uploaded logo fall back to the placeholder.
    for (const [label, envelope] of [
      ['unwrapped', false],
      ['enveloped', true],
    ] as const) {
      const token = `logo-share-token-${label}`;
      host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__ = {
        drive: {
          async openShareLinksDownloadUrlsCreate(requestedToken: string) {
            const item = {
              downloadUrl: `https://cdn.example.com/${requestedToken}.png`,
              expiresAtEpochMs: String(Date.now() + 3_600_000),
            };
            return envelope ? { code: 0, data: { item } } : { item };
          },
        },
      };

      try {
        const media = attachDriveShareToken(
          uploadResultToDriveMediaResource(uploadResult),
          token,
        );
        await expect(resolveDriveMediaUrl(media)).resolves.toBe(
          `https://cdn.example.com/${token}.png`,
        );
      } finally {
        host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__ = original;
      }
    }
  });
});

describe('drive media session caches', () => {
  it('drops cached share tokens and presigned urls when the session changes', async () => {
    const host = globalThis as typeof globalThis & {
      __SDKWORK_DRIVE_APP_SDK_CLIENT__?: unknown;
      __SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__?: unknown;
    };
    const originalAppClient = host.__SDKWORK_DRIVE_APP_SDK_CLIENT__;
    const originalOpenClient = host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__;

    let tokenMints = 0;
    let urlExchanges = 0;
    host.__SDKWORK_DRIVE_APP_SDK_CLIENT__ = {
      drive: {
        shareLinks: {
          async create() {
            tokenMints += 1;
            return { token: `session-share-token-${tokenMints}` };
          },
        },
      },
    };
    host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__ = {
      drive: {
        async openShareLinksDownloadUrlsCreate(requestedToken: string) {
          urlExchanges += 1;
          return {
            item: {
              downloadUrl: `https://cdn.example.com/${requestedToken}/${urlExchanges}.png`,
              expiresAtEpochMs: String(Date.now() + 3_600_000),
            },
          };
        },
      },
    };

    try {
      clearDriveMediaCaches();
      const media = uploadResultToDriveMediaResource(uploadResult);

      // The first pass mints one share token and one presigned URL; the second
      // pass proves both results are cached for the session.
      await expect(resolveDriveMediaUrl(media)).resolves.toBe(
        'https://cdn.example.com/session-share-token-1/1.png',
      );
      await expect(resolveDriveMediaUrl(media)).resolves.toBe(
        'https://cdn.example.com/session-share-token-1/1.png',
      );
      expect(tokenMints).toBe(1);
      expect(urlExchanges).toBe(1);

      // A sign-out/account switch must not reuse account A's token or URL.
      clearDriveMediaCaches();
      await expect(resolveDriveMediaUrl(media)).resolves.toBe(
        'https://cdn.example.com/session-share-token-2/2.png',
      );
      expect(tokenMints).toBe(2);
      expect(urlExchanges).toBe(2);
    } finally {
      clearDriveMediaCaches();
      host.__SDKWORK_DRIVE_APP_SDK_CLIENT__ = originalAppClient;
      host.__SDKWORK_CLOUDROUTER_ROUTER_DRIVE_OPEN_SDK_CLIENT__ = originalOpenClient;
    }
  });
});
