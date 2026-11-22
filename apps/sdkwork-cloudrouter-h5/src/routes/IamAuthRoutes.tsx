import { useNavigate } from 'react-router-dom';

import { SdkworkIamH5AuthCallbackSurface } from '@sdkwork/iam-h5-auth';
import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

import { APP_OAUTH_CALLBACK_PATH } from '../oauth/appAuthorizeEntry.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

/**
 * IAM H5 OAuth callback route.
 *
 * The shared IAM auth surface exchanges the provider `code`/`state` for a
 * session and commits it through the host bridge; this route only returns the
 * visitor to the console home afterwards. It is mounted outside the tab shell
 * because the callback is a transient auth screen, not a console tab, and it
 * lives in the `/oauth` namespace because the provider round trip is an OAuth
 * hop rather than a page of the account surface.
 */
export function IamOAuthCallbackRoute() {
  const runtime = useConsoleRuntime();
  const navigate = useNavigate();
  const returnHome = () => {
    navigate(CLOUDROUTER_CONSOLE_ROUTES.dashboard.path, { replace: true });
  };

  return (
    <SdkworkIamH5AuthCallbackSurface
      controller={runtime.iamAuthController}
      locale={runtime.locale}
      oauthCallbackPath={APP_OAUTH_CALLBACK_PATH}
      onAuthenticated={returnHome}
      onScanLoginCompleted={returnHome}
    />
  );
}
