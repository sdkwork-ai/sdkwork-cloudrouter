import {
  SdkworkIamAuthRoutes,
  type SdkworkAuthBrand,
} from '@sdkwork/auth-pc-react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@sdkwork/cloudroutes-pc-commons';
import {
  useResolvedBrandLogoUrl,
  useSiteBranding,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { resolveCloudRouterAuthAppearance } from './cloudRouterAuthAppearance';
import { getCloudRouterAuthRuntime } from './cloudRouterAuthRuntime';
import { CloudRouterAuthShell } from './CloudRouterAuthShell';
import { useCloudRouterAuthRuntimeConfig } from './cloudRouterAuthConfig';
import { InviteGate } from './InviteGate';
import { cloudRouterTauriAuthHostReadiness } from './cloudRouterTauriAuthHost';
import { CLOUD_ROUTER_AUTH_BASE_PATH } from './cloudRouterAuthPaths';

const AUTH_METHOD_UNAVAILABLE_MESSAGE = 'This Cloud Router sign-in method is temporarily unavailable.';

void cloudRouterTauriAuthHostReadiness;

export function CloudRouterAuthRoutes() {
  const { i18n } = useTranslation();
  const runtimeConfig = useCloudRouterAuthRuntimeConfig();
  const siteBranding = useSiteBranding();
  // Auth is the first surface a user sees, so it must carry the brand the
  // operator published in `/admin/site` instead of the shared IAM identity the
  // auth package ships with.
  //
  // The resolved URL follows Drive share links, so an uploaded logo keeps working after its
  // reader link rotates; the shipped mark is the fallback rather than an absent `logoUrl`,
  // because both the shell here and the IAM pages render the brand from this one object.
  const brandLogoUrl = useResolvedBrandLogoUrl(siteBranding);
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const brand: SdkworkAuthBrand = {
    name: displaySiteName,
    logoUrl: brandLogoUrl,
  };
  // The same lockup the homepage navbar renders: the backend-configured site
  // branding (logo, or the shipped mark, plus the short name), so the hosted
  // auth header cannot drift from the top-left of the product.
  const brandHeader = (
    <span className="flex min-w-0 items-center gap-2">
      <BrandMark branding={siteBranding} />
      <span className="hidden truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:inline md:max-w-[10rem] lg:max-w-[12rem]">
        {displaySiteName}
      </span>
    </span>
  );

  return (
    <CloudRouterAuthShell brand={brand}>
      <InviteGate>
        <SdkworkIamAuthRoutes
          appearance={resolveCloudRouterAuthAppearance()}
          basePath={CLOUD_ROUTER_AUTH_BASE_PATH}
          brand={brand}
          brandHeader={brandHeader}
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
