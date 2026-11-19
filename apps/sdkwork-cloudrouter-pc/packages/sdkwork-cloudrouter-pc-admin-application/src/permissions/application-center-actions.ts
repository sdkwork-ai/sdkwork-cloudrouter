import { hasPermissionInScope } from "@sdkwork/iam-contracts";
import { readPortalPermissionScope } from "@sdkwork/cloudroutes-pc-commons/runtime";

/**
 * Action-level permission seam for the App Center.
 *
 * Template actions are gated on the Deploy permission codes the Deploy route
 * manifests actually enforce
 * (`sdks/_route-manifests/app-api/sdkwork-routes-deploy-app-api.route-manifest.json`,
 * `sdks/_route-manifests/backend-api/sdkwork-routes-deploy-backend-api.route-manifest.json`):
 *
 * - authoring/review (`PATCH|POST|DELETE /app_templates`, backend
 *   `PATCH /app_templates/{templateUuid}`) requires `deploy.appTemplates.write`;
 * - template taxonomy maintenance (`POST|PATCH|DELETE /template_categories`)
 *   requires `deploy.templateCategories.write`;
 * - the remix source reads (`GET /apps/{appId}/source`, `GET /remix`) require
 *   `deploy.apps.read`, and its writes (`PUT|DELETE /source`, `PUT /remix`)
 *   require `deploy.apps.write`;
 * - reads require the matching `*.read` codes.
 *
 * The remaining App Store actions keep the module gate because their IAM
 * catalog still defines no finer code.
 *
 * `isApplicationCenterActionAllowed` accepts the deploy code OR the module
 * gate: this application's declared `backend.accessTokenPermissionScope`
 * (`agent.app.config.json`) carries only `cloudrouter.*` / `iam.*` /
 * `community.*` codes, so gating solely on a deploy code would hide every
 * template control from an operator the backend still authorizes. The Deploy
 * backend stays the authority: it rejects the request without the deploy grant,
 * and the UI gate is defense in depth only.
 */
export const APPLICATION_CENTER_MODULE_PERMISSION = "cloudrouter.admin.access";

export const APPLICATION_CENTER_ACTION_PERMISSIONS = {
  templateReview: "deploy.appTemplates.write",
  templateWrite: "deploy.appTemplates.write",
  templateCategoryWrite: "deploy.templateCategories.write",
  /**
   * Remix source surface (`apps.source.*` / `apps.remix.*`). The route manifest
   * gates every read on `deploy.apps.read` and every write on `deploy.apps.write`,
   * and `artifacts.list` — the archive picker — on `deploy.artifacts.read`.
   */
  sourceRead: "deploy.apps.read",
  sourceWrite: "deploy.apps.write",
  /** `apps.identityProvision` is a Deploy write command. */
  identityProvision: "deploy.apps.write",
  storeCategoryWrite: APPLICATION_CENTER_MODULE_PERMISSION,
  moderationDecide: APPLICATION_CENTER_MODULE_PERMISSION,
  publisherVerify: APPLICATION_CENTER_MODULE_PERMISSION,
  collectionWrite: APPLICATION_CENTER_MODULE_PERMISSION,
  featuredWrite: APPLICATION_CENTER_MODULE_PERMISSION,
  listingVisibility: APPLICATION_CENTER_MODULE_PERMISSION,
  integrationWrite: APPLICATION_CENTER_MODULE_PERMISSION,
} as const;

export type ApplicationCenterAction = keyof typeof APPLICATION_CENTER_ACTION_PERMISSIONS;

/** Resolve the permission code an action requires. */
export function applicationCenterPermissionFor(action: ApplicationCenterAction): string {
  return APPLICATION_CENTER_ACTION_PERMISSIONS[action];
}

/**
 * Whether the given session scope grants the action.
 *
 * Pass `permissionScope` in tests; production callers read the live portal
 * session scope, which the admin layout refreshes on session changes. Wildcard
 * grants (`*`, `deploy.*`) resolve through the shared IAM matcher.
 */
export function isApplicationCenterActionAllowed(
  action: ApplicationCenterAction,
  permissionScope: readonly string[] = readPortalPermissionScope(),
): boolean {
  const required = applicationCenterPermissionFor(action);
  return hasPermissionInScope(permissionScope, required)
    || hasPermissionInScope(permissionScope, APPLICATION_CENTER_MODULE_PERMISSION);
}
