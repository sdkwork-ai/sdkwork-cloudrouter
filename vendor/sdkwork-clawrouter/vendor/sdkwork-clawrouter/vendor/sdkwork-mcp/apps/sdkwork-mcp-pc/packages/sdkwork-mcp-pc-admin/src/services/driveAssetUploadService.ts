import type { DriveUploaderProfile } from '@sdkwork/drive-app-sdk';
import type { SdkworkDriveAppClient } from '@sdkwork/drive-app-sdk';
import { formatDrivePackageRef } from '@sdkwork/mcp-pc-commons/driveUri';
import {
  resolveMCPDriveParentNodeId,
  resolveMCPDriveSpaceId,
} from '@sdkwork/mcp-pc-commons/runtime';

export type DriveAssetUploadOptions = {
  spaceId?: string;
  parentNodeId?: string;
  appResourceType?: string;
  scene?: string;
  uploadProfileCode?: DriveUploaderProfile;
};

export async function uploadDriveAsset(
  driveClient: SdkworkDriveAppClient,
  file: File,
  options: DriveAssetUploadOptions = {},
): Promise<string> {
  const spaceId = options.spaceId ?? resolveMCPDriveSpaceId();
  if (!spaceId) {
    throw new Error(
      'VITE_SDKWORK_MCP_DRIVE_SPACE_ID is required before uploading assets through sdkwork-drive.',
    );
  }

  const uploadResult = await driveClient.uploader.upload({
    file,
    appResourceType: options.appResourceType ?? 'mcp-pc-asset-upload',
    appResourceId: file.name,
    scene: options.scene ?? 'mcp_admin_asset_upload',
    source: 'pc_local_file',
    spaceId,
    parentNodeId: options.parentNodeId ?? resolveMCPDriveParentNodeId(),
    uploadProfileCode: options.uploadProfileCode ?? 'generic',
    originalFileName: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  return formatDrivePackageRef(uploadResult.uploadItem.spaceId, uploadResult.uploadItem.nodeId);
}

export async function uploadServerIcon(
  driveClient: SdkworkDriveAppClient,
  file: File,
): Promise<string> {
  return uploadDriveAsset(driveClient, file, {
    appResourceType: 'mcp-server-icon',
    scene: 'mcp_server_icon_upload',
    uploadProfileCode: 'image',
  });
}
