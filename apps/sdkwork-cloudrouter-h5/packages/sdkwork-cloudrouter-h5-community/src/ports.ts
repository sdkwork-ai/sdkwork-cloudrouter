import {
  configureCommunityAuthSessionPort,
  configureCommunityFeedsPort,
  configureCommunityMediaRuntimePort,
  configureCommunityOrderRuntime,
  configureCommunityRuntimePort,
} from '@sdkwork/community-mobile-react-community';
import { createGeneratedCommunityAppSdkPort } from '@sdkwork/community-runtime';
import { createDriveUploadImageService } from '@sdkwork/drive-upload-image-core';

import { readCloudRouterSession } from '@sdkwork/cloudrouter-h5-core/session';

import {
  getCloudRouterH5CommunityAppSdkClient,
  getCloudRouterH5DriveAppSdkClient,
  getCloudRouterH5FeedsOpenSdkClient,
  getCloudRouterH5OrderAppSdkClient,
} from '@sdkwork/cloudrouter-h5-core/sdk';

import { CLOUDROUTER_H5_COMMUNITY_POST_UPLOAD } from './uploadDeclaration.js';

/**
 * Binds the shared community mobile UI to the Cloud Router H5 host.
 *
 * The community package intentionally ships no demo data: every read and write
 * goes through the generated Community App SDK port configured here. Feeds
 * reads use the standard feeds stream (open surface), media writes use the
 * Drive uploader, and circle membership orders settle through sdkwork-order.
 */
let bootstrapped = false;

export function bootstrapCommunityH5(): void {
  if (bootstrapped) {
    return;
  }
  bootstrapped = true;

  // The generated client already holds the shared TokenManager, so the port
  // wrapper only needs the client surface.
  configureCommunityRuntimePort(createGeneratedCommunityAppSdkPort(getCloudRouterH5CommunityAppSdkClient()));
  configureCommunityFeedsPort(getCloudRouterH5FeedsOpenSdkClient());

  const driveClient = getCloudRouterH5DriveAppSdkClient();
  const imageService = createDriveUploadImageService({
    uploader: driveClient.uploader,
    declaration: CLOUDROUTER_H5_COMMUNITY_POST_UPLOAD,
  });
  configureCommunityMediaRuntimePort({
    async uploadImages(files: File[]): Promise<string[]> {
      const uris: string[] = [];
      for (const file of files) {
        const value = await imageService.upload({
          file,
          appResourceId: 'community',
        });
        uris.push(value.uri);
      }
      return uris;
    },
    async resolveDisplayUrl(uri: string): Promise<string | null> {
      if (!uri.startsWith('drive://')) {
        return uri;
      }
      const matched = /^drive:\/\/spaces\/([^/]+)\/nodes\/([^/?#]+)/u.exec(uri);
      const nodeId = matched?.[2];
      if (!nodeId) {
        return null;
      }
      const grant = await driveClient.drive.downloadGrants.create(nodeId, {
        requestedTtlSeconds: 900,
      });
      const downloadUrl =
        (grant as { downloadUrl?: unknown; data?: { downloadUrl?: unknown } }).downloadUrl
        ?? (grant as { data?: { downloadUrl?: unknown } }).data?.downloadUrl;
      return typeof downloadUrl === 'string' && downloadUrl.startsWith('http')
        ? downloadUrl
        : null;
    },
  });

  const orderClient = getCloudRouterH5OrderAppSdkClient();
  configureCommunityOrderRuntime({
    async createMembershipOrder(options) {
      const result = await orderClient.memberships.orders.create(
        {
          action: 'purchase',
          packageId: options.packageId,
          paymentMethod: options.paymentMethod,
          paymentProduct: 'mobile_cashier_h5',
          source: options.source ?? 'community-circle',
        },
        { idempotencyKey: createIdempotencyKey() },
      );
      return {
        orderId: result.orderId,
        orderNo: result.orderNo,
        amount: result.amount,
        cashierUrl: result.cashierUrl,
      };
    },
  });

  configureCommunityAuthSessionPort({
    getCurrentUser() {
      const session = readCloudRouterSession();
      return session.subject ? { id: session.subject } : null;
    },
  });
}

function createIdempotencyKey(): string {
  const host = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const randomUUID = host.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(host.crypto);
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Test seam: restores the unconfigured package state between test cases. */
export function resetCommunityH5Bootstrap(): void {
  bootstrapped = false;
}
