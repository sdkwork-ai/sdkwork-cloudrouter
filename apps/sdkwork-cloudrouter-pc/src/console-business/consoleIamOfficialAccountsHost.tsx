import { useMemo, type ReactNode } from 'react';
import {
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  SdkworkOfficialAccountsPanel,
  createOfficialAccountsController,
  createSelfServiceTransport,
  type OfficialAccountsController,
} from '@sdkwork/iam-pc-official-accounts';
import { getSdkworkAppbaseAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Console-side official-account self-service page.
 *
 * The Cloud Router console mounts the same unified component the admin surface
 * mounts (through `@sdkwork/iam-pc-admin-oauth`), in its self-service posture
 * instead of the operator one: the caller sees and maintains only the
 * `iam_oauth_resource_account` rows whose `maintainer_user_id` is their own
 * identity, over the IAM app API
 * (`/app/v3/api/iam/oauth/official_accounts`). There is no backend-admin client
 * and no tenant-wide listing on this surface.
 *
 * The IAM app SDK client is the same generated `Client.iam.oauth.officialAccounts`
 * slice the rest of the portal builds (`@sdkwork/iam-app-sdk` is aliased as the
 * appbase app client), so the shared request boundary, session auth, and locale
 * propagation are already attached; this host only adapts it to the transport
 * the shared controller consumes.
 */
let officialAccountsController: OfficialAccountsController | null = null;

function readOfficialAccountsController(): OfficialAccountsController {
  if (!officialAccountsController) {
    officialAccountsController = createOfficialAccountsController(
      createSelfServiceTransport(getSdkworkAppbaseAppSdkClient().iam.oauth.officialAccounts),
      DEFAULT_SELF_SERVICE_CAPABILITIES,
    );
  }
  return officialAccountsController;
}

/** `/console/iam/oauth/official-accounts` — the caller's own official accounts. */
export function CloudRouterConsoleIamOfficialAccountsRoute(): ReactNode {
  // One store per console session: the client is a process singleton, so the
  // controller must be too, or every navigation would rebuild the list.
  const controller = useMemo(readOfficialAccountsController, []);
  return (
    <SdkworkOfficialAccountsPanel
      capabilities={DEFAULT_SELF_SERVICE_CAPABILITIES}
      controller={controller}
    />
  );
}
