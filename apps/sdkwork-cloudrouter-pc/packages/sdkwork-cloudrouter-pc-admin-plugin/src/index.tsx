import { PluginsPage as PluginsBlock, PluginCategoriesPage as PluginCategoriesBlock } from '@sdkwork/plugins-pc-admin';
import { configurePluginsAdminRuntime } from '@sdkwork/plugins-pc-admin/pluginsAdminService';
import {
  getPluginsBackendSdkClient,
  getSdkworkDriveAppSdkClient,
  readPortalRoleCodes,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

/**
 * Binds the host runtime once, as a side effect of loading this chunk.
 *
 * The Plugins admin block takes no client props: it reads its backend SDK
 * client from the runtime configured through `configurePluginsAdminRuntime`,
 * so it has to be registered before the first render. Binding at module scope
 * is what the console Agents seam (`sdkwork-cloudrouter-pc-console-agents`)
 * does too, and it also means a route that imports this package but fails
 * before rendering still leaves the runtime wired for whatever renders next.
 *
 * The backend client comes from the host commons getter — same-origin base
 * URL, the portal session token manager, and the shared session auth
 * boundary — so this block never configures transport itself.
 */
configurePluginsAdminRuntime({
  getBackendSdkClient: getPluginsBackendSdkClient,
  getDriveSdkClient: getSdkworkDriveAppSdkClient,
});

/**
 * Cloud Router admin-console entry for the plugin management page
 * (`/admin/plugin`).
 *
 * The page owns its own catalog layout, category filter and role-scope switch;
 * this adapter only supplies the operator's IAM role codes so "my roles" means
 * the signed-in operator rather than a hard-coded list.
 */
export function PluginsAdminPage() {
  return <PluginsBlock roleCodes={readPortalRoleCodes()} />;
}

export { PluginCategoriesBlock as PluginCategoriesAdminPage };
