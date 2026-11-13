import { useNavigate } from 'react-router-dom';

import { SdkworkIamH5AuthCallbackSurface } from '@sdkwork/iam-h5-auth';
import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

import { useConsoleRuntime } from '../providers/AppProviders.js';

/**
 * IAM H5 OAuth callback route.
 *
 * The shared IAM auth surface exchanges the provider `code`/`state` for a
 * session and commits it through the host bridge; this route only returns the
 * visitor to the console home afterwards. It is mounted outside the tab shell
 * because the callback is a transient auth screen, not a console tab.
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
      onAuthenticated={returnHome}
      onScanLoginCompleted={returnHome}
    />
  );
}
