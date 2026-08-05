import {
  getSdkworkAppbaseAppSdkClient,
  getSdkworkAppbaseBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { createSdkworkIamService, type SdkworkIamService } from '@sdkwork/iam-service';

/**
 * IAM admin service singleton for the Cloud Router admin surface.
 *
 * The IAM admin capability packages (users, tenants, organizations, permission
 * catalog, oauth, account-binding, audit) never create their own HTTP clients;
 * all mutations flow through this injected `SdkworkIamService`, which reuses
 * the portal's existing IAM app/backend SDK clients (token manager, session
 * auth boundary, runtime base URLs) from @sdkwork/cloudroutes-pc-commons.
 */
let cloudRouterIamAdminService: SdkworkIamService | null = null;

export function getCloudRouterIamAdminService(): SdkworkIamService {
  if (!cloudRouterIamAdminService) {
    cloudRouterIamAdminService = createSdkworkIamService({
      appbaseAppClient: getSdkworkAppbaseAppSdkClient() as Parameters<typeof createSdkworkIamService>[0]['appbaseAppClient'],
      appbaseBackendClient: getSdkworkAppbaseBackendSdkClient() as Parameters<typeof createSdkworkIamService>[0]['appbaseBackendClient'],
    });
  }
  return cloudRouterIamAdminService;
}

export function resetCloudRouterIamAdminService(): void {
  cloudRouterIamAdminService = null;
}
