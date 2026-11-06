import {
  getSdkworkAppbaseAppSdkClient,
  getSdkworkAppbaseBackendSdkClient,
} from "@sdkwork/cloudroutes-pc-commons/runtime";
import { createSdkworkIamService, type SdkworkIamService } from "@sdkwork/iam-service";

/**
 * IAM service used by the application catalog page.
 *
 * The page resolves the tenant/organization labels and the IAM application
 * group through the same injected IAM service boundary the IAM admin routes
 * use, so no HTTP client is created here.
 */
let applicationCatalogIamService: SdkworkIamService | null = null;

export function getApplicationCatalogIamService(): SdkworkIamService {
  if (!applicationCatalogIamService) {
    applicationCatalogIamService = createSdkworkIamService({
      appbaseAppClient: getSdkworkAppbaseAppSdkClient() as Parameters<typeof createSdkworkIamService>[0]["appbaseAppClient"],
      appbaseBackendClient: getSdkworkAppbaseBackendSdkClient() as Parameters<typeof createSdkworkIamService>[0]["appbaseBackendClient"],
    });
  }
  return applicationCatalogIamService;
}

export function resetApplicationCatalogIamService(): void {
  applicationCatalogIamService = null;
}
