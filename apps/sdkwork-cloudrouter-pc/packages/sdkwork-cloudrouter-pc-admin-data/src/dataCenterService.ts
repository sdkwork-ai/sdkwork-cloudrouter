/**
 * Data Center service boundary.
 *
 * The Data Center is a standalone data platform that ships its own backend
 * (`/backend/v3/api/datacenter/*`). Until that backend and its generated SDK
 * land, this module owns a typed client port instead of calling an endpoint
 * that does not exist yet. Consequences that keep the page honest:
 *
 * - no client is configured by default, so every page renders an explicit
 *   "backend not provisioned" state instead of fabricated numbers;
 * - once the generated SDK exists, the host binds a client built on it via
 *   `configureDataCenterClient`, exactly once, at app bootstrap;
 * - the port is the only place that may touch the network, so swapping the
 *   transport never leaks into pages.
 */

export type DataCenterSourceHealth = 'healthy' | 'warning' | 'error';

export interface DataCenterSourceSummary {
  id: string;
  name: string;
  kind: string;
  health: DataCenterSourceHealth;
  tableCount: number;
  lastTestedAt: string | null;
}

export type DataCenterTableKind = 'landed' | 'external' | 'view';

export interface DataCenterTableSummary {
  id: string;
  name: string;
  kind: DataCenterTableKind;
  /** Decimal string: row counts can exceed Number.MAX_SAFE_INTEGER. */
  rowCount: string;
  columnCount: number;
  owner: string;
  updatedAt: string;
}

export type DataCenterExportStatus =
  | 'pending_approval'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'expired';

export interface DataCenterExportSummary {
  id: string;
  datasetName: string;
  status: DataCenterExportStatus;
  /** Decimal string for the same reason as `rowCount`. */
  rowCount: string;
  requestedBy: string;
  expiresAt: string;
}

export type DataCenterAuditAction =
  | 'connect'
  | 'query'
  | 'download'
  | 'ddl'
  | 'dml'
  | 'publish'
  | 'approve'
  | 'rollback';

export interface DataCenterAuditSummary {
  id: string;
  actor: string;
  action: DataCenterAuditAction;
  object: string;
  /** Decimal string for the same reason as `rowCount`. */
  rowCount: string;
  result: 'success' | 'failure';
  at: string;
}

export interface DataCenterOverviewSummary {
  sources: number;
  tables: number;
  todayInstances: number;
  pendingExports: number;
  /** Percentage rendered as a decimal string, e.g. `99.20`. */
  successRate: string;
}

export interface DataCenterClient {
  fetchOverview(): Promise<DataCenterOverviewSummary>;
  listSources(): Promise<readonly DataCenterSourceSummary[]>;
  listTables(): Promise<readonly DataCenterTableSummary[]>;
  listExports(): Promise<readonly DataCenterExportSummary[]>;
  listAudits(): Promise<readonly DataCenterAuditSummary[]>;
}

/** Raised when a page tries to act before the datacenter backend is bound. */
export class DataCenterBackendPendingError extends Error {
  constructor() {
    super('Data center backend has not been provisioned for this deployment.');
    this.name = 'DataCenterBackendPendingError';
  }
}

let dataCenterClient: DataCenterClient | null = null;

/** Host-owned seam: bind the generated-SDK-backed client at bootstrap. */
export function configureDataCenterClient(next: DataCenterClient | null): void {
  dataCenterClient = next;
}

export function isDataCenterBackendAvailable(): boolean {
  return dataCenterClient !== null;
}

function requireClient(): DataCenterClient {
  if (!dataCenterClient) {
    throw new DataCenterBackendPendingError();
  }
  return dataCenterClient;
}

function ensureArray<T>(value: readonly T[] | null | undefined, field: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Data center ${field} response must be an array.`);
  }
  return value;
}

function ensureCount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Data center ${field} must be a non-negative integer.`);
  }
  return value;
}

function normalizeOverview(value: DataCenterOverviewSummary): DataCenterOverviewSummary {
  const successRate = value.successRate;
  if (typeof successRate !== 'string') {
    throw new Error('Data center overview.successRate must be a decimal string.');
  }
  return {
    sources: ensureCount(value.sources, 'overview.sources'),
    tables: ensureCount(value.tables, 'overview.tables'),
    todayInstances: ensureCount(value.todayInstances, 'overview.todayInstances'),
    pendingExports: ensureCount(value.pendingExports, 'overview.pendingExports'),
    successRate,
  };
}

/**
 * Typed facade used by pages. Every method rejects with
 * `DataCenterBackendPendingError` while no client is bound, so callers can
 * branch on the state instead of guessing whether data is empty or absent.
 */
export const DataCenterService = {
  async fetchOverview(): Promise<DataCenterOverviewSummary> {
    return normalizeOverview(await requireClient().fetchOverview());
  },
  async listSources(): Promise<readonly DataCenterSourceSummary[]> {
    return ensureArray(await requireClient().listSources(), 'sources');
  },
  async listTables(): Promise<readonly DataCenterTableSummary[]> {
    return ensureArray(await requireClient().listTables(), 'tables');
  },
  async listExports(): Promise<readonly DataCenterExportSummary[]> {
    return ensureArray(await requireClient().listExports(), 'exports');
  },
  async listAudits(): Promise<readonly DataCenterAuditSummary[]> {
    return ensureArray(await requireClient().listAudits(), 'audits');
  },
};
