import {
  SdkworkIamAuthRoutes,
  type SdkworkAuthBrand,
} from '@sdkwork/auth-pc-react';
import { useTranslation } from 'react-i18next';
import {
  useResolvedMediaResourceUrl,
  useSiteBranding,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { resolveCloudRouterAuthAppearance } from './cloudRouterAuthAppearance';
import { getCloudRouterAuthRuntime } from './cloudRouterAuthRuntime';
import { CloudRouterAuthShell } from './CloudRouterAuthShell';
import { useCloudRouterAuthRuntimeConfig } from './cloudRouterAuthConfig';
import { InviteGate } from './InviteGate';
import { cloudRouterTauriAuthHostReadiness } from './cloudRouterTauriAuthHost';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Cloud Router sign-in method is temporarily unavailable.';

void cloudRouterTauriAuthHostReadiness;

export function CloudRouterAuthRoutes() {
  const { i18n } = useTranslation();
  const runtimeConfig = useCloudRouterAuthRuntimeConfig();
  const siteBranding = useSiteBranding();
  // Auth is the first surface a user sees, so it must carry the brand the
  // operator published in `/admin/site` instead of the shared IAM identity the
  // auth package ships with.
  const brandLogoUrl = useResolvedMediaResourceUrl(siteBranding.logo);
  const brand: SdkworkAuthBrand = {
    name: siteBranding.siteName,
    ...(brandLogoUrl ? { logoUrl: brandLogoUrl } : {}),
  };

  return (
    <CloudRouterAuthShell brand={brand}>
      <InviteGate>
        <SdkworkIamAuthRoutes
          appearance={resolveCloudRouterAuthAppearance()}
          basePath="/auth"
          brand={brand}
          className="!bg-transparent"
          getRuntime={getCloudRouterAuthRuntime}
          homePath="/"
          locale={i18n.language}
          methodUnavailableMessage={AUTH_METHOD_UNAVAILABLE_MESSAGE}
          runtimeConfig={runtimeConfig}
          viewportMode="flow"
        />
      </InviteGate>
    </CloudRouterAuthShell>
  );
}
