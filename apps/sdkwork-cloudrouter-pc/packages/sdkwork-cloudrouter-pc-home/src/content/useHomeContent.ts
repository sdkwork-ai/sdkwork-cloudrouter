import { useMemo } from 'react';
import { useSiteBranding } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { createHomeContentRuntime, type HomeContentRuntime } from './home-content.ts';

/**
 * Subscribes the homepage to the operator-authored content published from `/admin/site`.
 *
 * Reads through the shared site-branding runtime rather than issuing its own request: the homepage
 * already waits on that fetch for the site name and logo, and a second request would let the two
 * answers disagree — the classic "logo updated but the headline still says the old product" bug.
 */
export function useHomeContent(): HomeContentRuntime {
  const siteBranding = useSiteBranding();
  const { siteName, homepage, downloads } = siteBranding;

  return useMemo(
    () => createHomeContentRuntime({ downloads, homepage, siteName }),
    [downloads, homepage, siteName],
  );
}
