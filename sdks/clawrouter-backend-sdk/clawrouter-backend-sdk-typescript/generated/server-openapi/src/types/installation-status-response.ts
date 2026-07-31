/** Installation status response schema exposed by Claw Router. */
export interface InstallationStatusResponse {
  /** Catalog source field on installation status response. */
  catalogSource: string;
  /** Catalog version field on installation status response. */
  catalogVersion: string;
  /** Changed field on installation status response. */
  changed: boolean;
  /** Environment field on installation status response. */
  environment: string;
  /** External catalog field on installation status response. */
  externalCatalog: boolean;
  /** Last catalog refresh status field on installation status response. */
  lastCatalogRefreshStatus: 'succeeded' | 'schema_not_ready' | 'dependency_schema_not_ready' | 'pending' | 'invalid' | 'catalog_unavailable';
  /** Schema version field on installation status response. */
  schemaVersion: string;
  /** Seed profile field on installation status response. */
  seedProfile: string;
  /** Status field on installation status response. */
  status: 'not_installed' | 'installed' | 'upgrade_required' | 'incomplete' | 'corrupt' | 'catalog_unavailable';
}
