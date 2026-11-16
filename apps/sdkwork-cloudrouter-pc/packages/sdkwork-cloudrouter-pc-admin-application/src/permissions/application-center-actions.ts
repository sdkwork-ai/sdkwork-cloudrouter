import { readPortalPermissionScope } from "@sdkwork/cloudroutes-pc-commons/runtime";

/**
 * Action-level permission seam for the App Center.
 *
 * The current IAM catalog only defines the module gate
 * `cloudrouter.admin.access`; every action therefore maps to that code. The
 * mapping is centralized so a future backend catalog can introduce finer codes
 * without touching page components, and the UI gate can be tightened in one
 * place. The backend remains the authority: hiding a control is defense in
 * depth, never the security boundary.
 */
export const APPLICATION_CENTER_ACTION_PERMISSIONS = {
  templateReview: "cloudrouter.admin.access",
  templateWrite: "cloudrouter.admin.access",
  templateCategoryWrite: "cloudrouter.admin.access",
  storeCategoryWrite: "cloudrouter.admin.access",
  moderationDecide: "cloudrouter.admin.access",
  publisherVerify: "cloudrouter.admin.access",
  collectionWrite: "cloudrouter.admin.access",
  featuredWrite: "cloudrouter.admin.access",
  listingVisibility: "cloudrouter.admin.access",
  integrationWrite: "cloudrouter.admin.access",
} as const;

export type ApplicationCenterAction = keyof typeof APPLICATION_CENTER_ACTION_PERMISSIONS;

/** Resolve the permission code an action currently requires. */
export function applicationCenterPermissionFor(action: ApplicationCenterAction): string {
  return APPLICATION_CENTER_ACTION_PERMISSIONS[action];
}

/**
 * Whether the given session scope grants the action.
 *
 * Pass `permissionScope` in tests; production callers read the live portal
 * session scope, which the admin layout refreshes on session changes.
 */
export function isApplicationCenterActionAllowed(
  action: ApplicationCenterAction,
  permissionScope: readonly string[] = readPortalPermissionScope(),
): boolean {
  return permissionScope.includes(applicationCenterPermissionFor(action));
}
