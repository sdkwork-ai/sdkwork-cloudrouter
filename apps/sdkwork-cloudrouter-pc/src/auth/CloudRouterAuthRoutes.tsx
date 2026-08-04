import {
  SdkworkIamAuthRoutes,
} from '@sdkwork/auth-pc-react';
import { useTranslation } from 'react-i18next';
import { resolveCloudRouterAuthAppearance } from './cloudRouterAuthAppearance';
import { getCloudRouterAuthRuntime } from './cloudRouterAuthRuntime';
import { CloudRouterAuthShell } from './CloudRouterAuthShell';
import { useCloudRouterAuthRuntimeConfig } from './cloudRouterAuthConfig';
import { cloudRouterTauriAuthHostReadiness } from './cloudRouterTauriAuthHost';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Cloud Router sign-in method is temporarily unavailable.';

void cloudRouterTauriAuthHostReadiness;

export function CloudRouterAuthRoutes() {
  const { i18n } = useTranslation();
  const runtimeConfig = useCloudRouterAuthRuntimeConfig();

  return (
    <CloudRouterAuthShell>
      <SdkworkIamAuthRoutes
        appearance={resolveCloudRouterAuthAppearance()}
        basePath="/auth"
        className="!bg-transparent"
        getRuntime={getCloudRouterAuthRuntime}
        homePath="/admin"
        locale={i18n.language}
        methodUnavailableMessage={AUTH_METHOD_UNAVAILABLE_MESSAGE}
        runtimeConfig={runtimeConfig}
        viewportMode="flow"
      />
    </CloudRouterAuthShell>
  );
}
