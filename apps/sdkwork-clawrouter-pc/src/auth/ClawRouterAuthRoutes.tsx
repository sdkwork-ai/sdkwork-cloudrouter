import {
  SdkworkIamAuthRoutes,
} from '@sdkwork/auth-pc-react';
import { useTranslation } from 'react-i18next';
import { resolveClawRouterAuthAppearance } from './clawRouterAuthAppearance';
import { getClawRouterAuthRuntime } from './clawRouterAuthRuntime';
import { ClawRouterAuthShell } from './ClawRouterAuthShell';
import { useClawRouterAuthRuntimeConfig } from './clawRouterAuthConfig';
import { clawRouterTauriAuthHostReadiness } from './clawRouterTauriAuthHost';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Claw Router sign-in method is temporarily unavailable.';

void clawRouterTauriAuthHostReadiness;

export function ClawRouterAuthRoutes() {
  const { i18n } = useTranslation();
  const runtimeConfig = useClawRouterAuthRuntimeConfig();

  return (
    <ClawRouterAuthShell>
      <SdkworkIamAuthRoutes
        appearance={resolveClawRouterAuthAppearance()}
        basePath="/auth"
        className="!bg-transparent"
        getRuntime={getClawRouterAuthRuntime}
        homePath="/admin"
        locale={i18n.language}
        methodUnavailableMessage={AUTH_METHOD_UNAVAILABLE_MESSAGE}
        runtimeConfig={runtimeConfig}
        viewportMode="flow"
      />
    </ClawRouterAuthShell>
  );
}
