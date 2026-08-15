import { describe, expect, it } from 'vitest';
import {
  attachDriveShareToken,
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
});
