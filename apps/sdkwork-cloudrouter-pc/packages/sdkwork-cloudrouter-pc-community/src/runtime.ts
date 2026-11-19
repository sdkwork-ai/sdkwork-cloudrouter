import {
  CommunityService,
  configureCommunityAuthSessionPort,
  configureCommunityFeedsPort,
  configureCommunityMediaRuntimePort,
  configureCommunityRuntimePort,
  getCommunityMediaRuntime,
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type MembershipTier,
  type Post,
  type PostComment,
  type Resource,
} from '@sdkwork/community-mobile-react-community/host';
import { createGeneratedCommunityAppSdkPort } from '@sdkwork/community-runtime';
import { createDriveUploadImageService } from '@sdkwork/drive-upload-image-core';
import {
  getSdkworkCommunityAppSdkClient,
  getSdkworkDriveAppSdkClient,
  getSdkworkFeedsOpenSdkClient,
  getSdkworkOrderAppSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { getCurrentAppSession } from '@sdkwork/cloudroutes-pc-commons/session-service';
import { CLOUDROUTER_PC_COMMUNITY_POST_UPLOAD } from './uploadDeclaration.ts';

/**
 * Community host wiring for the PC portal.
 *
 * The community domain service and runtime ports live in sdkwork-community.
 * This module only binds those ports to the Cloud Router PC composition:
 * generated Community App SDK, the standard feeds stream, Drive media upload,
 * and the order App SDK used for circle membership purchases.
 */
let configured = false;

export function ensureCommunityPcRuntime(): void {
  if (configured) {
    return;
  }
  configured = true;

  configureCommunityRuntimePort(
    createGeneratedCommunityAppSdkPort(getSdkworkCommunityAppSdkClient()),
  );
  configureCommunityFeedsPort(getSdkworkFeedsOpenSdkClient());

  const driveClient = getSdkworkDriveAppSdkClient();
  const imageService = createDriveUploadImageService({
    uploader: driveClient.uploader,
    declaration: CLOUDROUTER_PC_COMMUNITY_POST_UPLOAD,
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

  configureCommunityAuthSessionPort({
    getCurrentUser() {
      const session = getCurrentAppSession();
      const userId = session?.context?.userId;
      return userId ? { id: userId } : null;
    },
  });
}

export interface CreateCircleMembershipOrderInput {
  readonly circleId: string;
  readonly tierId: string;
  readonly packageId: string;
  readonly isLifetime: boolean;
  readonly paymentMethod: string;
}

export interface CircleMembershipOrderResult {
  readonly orderId: string;
  readonly orderNo: string;
  readonly amount: string;
  readonly cashierUrl: string;
}

/** Creates the membership order through sdkwork-order (`memberships.orders.create`). */
export async function createCircleMembershipOrder(
  input: CreateCircleMembershipOrderInput,
): Promise<CircleMembershipOrderResult> {
  const result = await getSdkworkOrderAppSdkClient().memberships.orders.create(
    {
      action: 'purchase',
      packageId: input.packageId,
      paymentMethod: input.paymentMethod,
      source: input.isLifetime ? 'community-circle-lifetime' : 'community-circle',
    },
    { idempotencyKey: createIdempotencyKey() },
  );
  return {
    orderId: result.orderId,
    orderNo: result.orderNo,
    amount: result.amount,
    cashierUrl: result.cashierUrl,
  };
}

/** Polls the order status; a paid order may then activate the membership. */
export async function isCircleOrderPaid(orderId: string): Promise<boolean> {
  const result = await getSdkworkOrderAppSdkClient().orders.status.retrieve(orderId);
  const status = typeof result.status === 'string' ? result.status : '';
  return status === 'paid' || status === 'completed';
}

export async function activateCircleMembership(
  circleId: string,
  orderId: string,
  tierId: string,
  packageId: string,
): Promise<void> {
  await CommunityService.activateMembership(circleId, orderId, tierId, packageId);
}

/** Uploads circle/post images through the configured Drive media port. */
export async function uploadCommunityImages(files: File[]): Promise<string[]> {
  ensureCommunityPcRuntime();
  return getCommunityMediaRuntime().uploadImages(files);
}

function createIdempotencyKey(): string {
  const host = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const randomUUID = host.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(host.crypto);
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export {
  CommunityService,
  type Community,
  type CommunityGroup,
  type CommunityMember,
  type MembershipTier,
  type Post,
  type PostComment,
  type Resource,
};
