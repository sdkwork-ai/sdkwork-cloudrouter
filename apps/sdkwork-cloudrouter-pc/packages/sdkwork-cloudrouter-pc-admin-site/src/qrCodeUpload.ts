import {
  attachDriveShareToken,
  getSdkworkDriveAppSdkClient,
  uploadResultToDriveMediaResource,
  type CloudRouterMediaResource,
  type DriveUploaderBlobLike,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

const QR_CODE_APP_RESOURCE_TYPE = 'site-settings';
const QR_CODE_APP_RESOURCE_ID = 'site-settings-qr-codes';
const QR_CODE_SCENE = 'admin_site_settings_qr_code';
const QR_CODE_SOURCE = 'cloudrouter-pc-admin-site-settings-qr-upload';

export async function uploadQrCodeImage(file: File): Promise<CloudRouterMediaResource> {
  const client = getSdkworkDriveAppSdkClient();
  const result = await client.uploader.upload({
    file: file as DriveUploaderBlobLike,
    appResourceType: QR_CODE_APP_RESOURCE_TYPE,
    appResourceId: QR_CODE_APP_RESOURCE_ID,
    scene: QR_CODE_SCENE,
    source: QR_CODE_SOURCE,
    uploadProfileCode: 'image',
    originalFileName: file.name,
    contentType: file.type || 'application/octet-stream',
    retention: { mode: 'long_term' },
  });
  const media = uploadResultToDriveMediaResource(result);
  const shareLink = await client.drive.shareLinks.create(result.uploadItem.nodeId, {
    id: createClientUuid(),
    role: 'reader',
  });
  return attachDriveShareToken(media, shareLink.token);
}

function createClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `qr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
