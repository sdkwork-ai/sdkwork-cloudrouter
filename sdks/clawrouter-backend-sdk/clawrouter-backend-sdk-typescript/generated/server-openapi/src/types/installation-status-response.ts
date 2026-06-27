/** Installation status response schema exposed by Claw Router. */
export interface InstallationStatusResponse {
  /** Catalog source field on installation status response. */
  catalogSource: string;
  /** Catalog version field on installation status response. */
  catalogVersion: string;
  /** Always false for status reads; install and upgrade actions report changes through the installer command path. */
  changed: boolean;
  /** Environment field on installation status response. */
  environment: string;
  /** External catalog field on installation status response. */
  externalCatalog: boolean;
  /** Last catalog refresh status field on installation status response. */
  lastCatalogRefreshStatus: 'not_run' | 'success' | 'dry_run' | 'failed';
  /** Schema version field on installation status response. */
  schemaVersion: string;
  /** Seed profile field on installation status response. */
  seedProfile: string;
  /** Status field on installation status response. */
  status: 'not_installed' | 'installed' | 'upgrade_required' | 'incomplete' | 'corrupt';
}
