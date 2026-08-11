import { Suspense, lazy, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getSdkworkAppbaseAppSdkClient,
  getSdkworkAppbaseBackendSdkClient,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { createSdkworkIamService, type SdkworkIamService } from '@sdkwork/iam-service';
import type { SdkworkIamOauthAdminController } from '@sdkwork/iam-pc-admin-oauth';

/**
 * Console surface host for the official account custom menu manager.
 *
 * The menu management page is a generic component from
 * `@sdkwork/iam-pc-admin-oauth`: admin and console mount the same surface with
 * their own IAM service and navigation. The console reaches it as a deep link
 * (`/console/iam/oauth/official-accounts/:resourceAccountId/custom-menus`);
 * the service is built from the shared portal IAM SDK clients, exactly like
 * the admin surface, without depending on the admin-iam package.
 */
let consoleIamService: SdkworkIamService | null = null;

function getConsoleIamService(): SdkworkIamService {
  if (!consoleIamService) {
    consoleIamService = createSdkworkIamService({
      appbaseAppClient: getSdkworkAppbaseAppSdkClient() as Parameters<typeof createSdkworkIamService>[0]['appbaseAppClient'],
      appbaseBackendClient: getSdkworkAppbaseBackendSdkClient() as Parameters<typeof createSdkworkIamService>[0]['appbaseBackendClient'],
    });
  }
  return consoleIamService;
}

const ConsoleIamOauthMenuPage = lazy(async () => {
  const { createSdkworkIamOauthAdminController, SdkworkIamOauthOfficialAccountCustomMenuPage } = await import('@sdkwork/iam-pc-admin-oauth');
  return {
    default: function ConsoleIamOauthMenuPageContent() {
      const navigate = useNavigate();
      const { resourceAccountId } = useParams<{ resourceAccountId: string }>();
      const controller = useMemo<SdkworkIamOauthAdminController>(
        () => createSdkworkIamOauthAdminController(getConsoleIamService()),
        [],
      );
      if (!resourceAccountId) {
        return null;
      }
      return (
        <SdkworkIamOauthOfficialAccountCustomMenuPage
          controller={controller}
          onBack={() => navigate('/console')}
          resourceAccountId={resourceAccountId}
        />
      );
    },
  };
});

export function CloudRouterConsoleIamOauthMenuRoute() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          Loading…
        </div>
      )}
    >
      <ConsoleIamOauthMenuPage />
    </Suspense>
  );
}
