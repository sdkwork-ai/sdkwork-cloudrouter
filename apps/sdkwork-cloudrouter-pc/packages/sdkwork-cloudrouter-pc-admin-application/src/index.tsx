/**
 * Cloud Router unified application management surfaces.
 *
 * The pages render one entity's applications from three independent platforms
 * (IAM, Deploy, App Store) behind a single grouped workspace. The IAM admin
 * packages expose row actions that navigate here for a tenant or organization.
 */
export {
  ApplicationManagementPage,
  CloudRouterOrganizationApplicationsPage,
  CloudRouterTenantApplicationsPage,
} from "./pages/ApplicationManagementPage";
export { CLOUDROUTER_APPLICATION_CATALOG_I18N, useApplicationCatalogMessages } from "./i18n";
export type { ApplicationCatalogMessages } from "./i18n";
export {
  isApplicationSourceUnavailable,
  loadAppStoreApplications,
  loadDeployApplications,
  loadIamApplications,
  resolveApplicationCatalogContext,
} from "./services/application-catalog";
export type {
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationGroupState,
  ApplicationRecord,
} from "./types/application-catalog";
