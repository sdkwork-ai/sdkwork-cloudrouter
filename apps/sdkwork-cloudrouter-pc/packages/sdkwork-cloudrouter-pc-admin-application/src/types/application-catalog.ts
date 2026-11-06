/**
 * Unified application catalog contract.
 *
 * An application management page can show one entity's applications from
 * several owning platforms. Each platform keeps its own transport and record
 * shape; this module normalizes them into one row shape so the page renders a
 * single table and search experience.
 */

export type ApplicationGroupId = "iam" | "deploy" | "app-store";

export interface ApplicationRecord {
  /** Stable identity within the group. */
  id: string;
  groupId: ApplicationGroupId;
  /** Primary display name. */
  name: string;
  /** Secondary identifier (app id, slug, or app key). */
  reference?: string;
  /** Content or application kind (pc / h5 / api / app kind / platform). */
  kind?: string;
  environment?: string;
  status?: string;
  /** Organization owning the application; absent means tenant-level. */
  organizationId?: string;
  domain?: string;
  version?: string;
  updatedAt?: string;
}

export interface ApplicationCatalogContext {
  tenantId: string;
  organizationId?: string;
  organizationName?: string;
  tenantName?: string;
}

export type ApplicationGroupStatus = "loading" | "ready" | "error";

export interface ApplicationGroupState {
  status: ApplicationGroupStatus;
  items: readonly ApplicationRecord[];
  /** Raw source failure; the page localizes it for display. */
  error?: unknown;
}

/** Loads one group's applications for the current entity context. */
export type ApplicationGroupLoader = (
  context: ApplicationCatalogContext,
) => Promise<readonly ApplicationRecord[]>;
