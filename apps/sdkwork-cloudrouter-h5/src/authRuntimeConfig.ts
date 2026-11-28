import { useEffect, useState } from 'react';

import type { SdkworkIamH5AuthRuntimeConfig } from '@sdkwork/iam-h5-auth';
import { getCloudRouterH5AppSdkClient } from '@sdkwork/cloudrouter-h5-core/sdk';

/**
 * Load the operator-published Cloud Router auth policy for the H5 surfaces.
 *
 * The endpoint is anonymous, so a signed-out visitor can resolve the flows
 * before any credential exists. A read failure falls back to `undefined`, which
 * makes the shared IAM screen keep its historical (unconfigured) behavior
 * instead of rendering an empty auth page.
 */
export function useCloudRouterH5AuthRuntimeConfig(): SdkworkIamH5AuthRuntimeConfig | undefined {
  const [runtimeConfig, setRuntimeConfig] = useState<SdkworkIamH5AuthRuntimeConfig | undefined>();

  useEffect(() => {
    let cancelled = false;

    getCloudRouterH5AppSdkClient()
      .iam.auth.runtime.retrieve()
      .then((settings) => {
        if (!cancelled) {
          setRuntimeConfig({
            loginMethods: settings.loginMethods,
            registerMethods: settings.registerMethods,
            recoveryMethods: settings.recoveryMethods,
            oauthLoginEnabled: settings.oauthLoginEnabled,
            ...(settings.verificationPolicy ? { verificationPolicy: settings.verificationPolicy } : {}),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeConfig(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return runtimeConfig;
}
