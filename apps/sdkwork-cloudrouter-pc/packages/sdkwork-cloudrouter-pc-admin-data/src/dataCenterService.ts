/**
 * Data Center service boundary.
 *
 * Every read goes through the generated `@sdkwork/cloudrouter-backend-sdk`
 * client (`/backend/v3/api/datacenter/*`); pages never build HTTP requests or
 * auth headers themselves. Responses are validated field by field so a partial
 * or malformed payload surfaces as a typed error instead of rendering as empty
 * data — the page must never claim "no data sources" when the answer was
 * actually unreadable.
 *
 * `int64` values (row counts) stay decimal strings end to end; nothing here
 * converts an id or a count to `number`.
 */

import {
  getCloudRouterBackendSdkClient,
  isRecord,
  readApiData,
  readRequiredApiItems,
  readRequiredNonNegativeInt64String,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

export type DataCenterSourceHealth = 'healthy' | 'warning' | 'error' | 'unknown';

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
  expiresAt: string | null;
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

export type DataCenterAuditResult = 'success' | 'failure';

export interface DataCenterAuditSummary {
  id: string;
  actor: string;
  action: DataCenterAuditAction;
  object: string;
  /** Decimal string for the same reason as `rowCount`. */
  rowCount: string;
  result: DataCenterAuditResult;
  at: string;
}

/** Counters stay decimal strings: they are int64 values the browser must not round. */
export interface DataCenterOverviewSummary {
  sources: string;
  tables: string;
  todayInstances: string;
  pendingExports: string;
  /** Percentage rendered as a decimal string, e.g. `99.20`. */
  successRate: string;
}

const SOURCE_HEALTH: readonly DataCenterSourceHealth[] = ['healthy', 'warning', 'error', 'unknown'];
const TABLE_KINDS: readonly DataCenterTableKind[] = ['landed', 'external', 'view'];
const EXPORT_STATUSES: readonly DataCenterExportStatus[] = [
  'pending_approval',
  'running',
  'succeeded',
  'failed',
  'expired',
];
const AUDIT_ACTIONS: readonly DataCenterAuditAction[] = [
  'connect',
  'query',
  'download',
  'ddl',
  'dml',
  'publish',
  'approve',
  'rollback',
];
const AUDIT_RESULTS: readonly DataCenterAuditResult[] = ['success', 'failure'];

function requiredCount(record: ApiRecord, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  throw new Error(`Data center ${key} must be a non-negative integer.`);
}

function requiredEnum<T extends string>(
  record: ApiRecord,
  key: string,
  allowed: readonly T[],
): T {
  const value = requiredString(record, key);
  const match = allowed.find((candidate) => candidate === value);
  if (!match) {
    throw new Error(`Data center ${key} must be one of ${allowed.join(', ')}.`);
  }
  return match;
}

function requiredString(record: ApiRecord, key: string): string {
  return readRequiredString(record, key, `Data center ${key} is required.`);
}

function optionalString(record: ApiRecord, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Data center ${key} must be a string or null.`);
  }
  return value;
}

function requireRecord(value: unknown, field: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(`Data center ${field} must be an object.`);
  }
  return value;
}

function normalizeOverview(payload: unknown): DataCenterOverviewSummary {
  const record = requireRecord(payload, 'overview');
  const successRate = record.successRate;
  if (typeof successRate !== 'string' || !/^[0-9]+(\.[0-9]+)?$/u.test(successRate)) {
    throw new Error('Data center overview.successRate must be a decimal string.');
  }
  return {
    sources: readRequiredNonNegativeInt64String(record, 'sources', 'Data center overview.sources is required.'),
    tables: readRequiredNonNegativeInt64String(record, 'tables', 'Data center overview.tables is required.'),
    todayInstances: readRequiredNonNegativeInt64String(
      record,
      'todayInstances',
      'Data center overview.todayInstances is required.',
    ),
    pendingExports: readRequiredNonNegativeInt64String(
      record,
      'pendingExports',
      'Data center overview.pendingExports is required.',
    ),
    successRate,
  };
}

function normalizeSource(payload: unknown): DataCenterSourceSummary {
  const record = requireRecord(payload, 'source');
  return {
    id: requiredString(record, 'id'),
    name: requiredString(record, 'name'),
    kind: requiredString(record, 'kind'),
    health: requiredEnum(record, 'health', SOURCE_HEALTH),
    tableCount: requiredCount(record, 'tableCount'),
    lastTestedAt: optionalString(record, 'lastTestedAt'),
  };
}

function normalizeTable(payload: unknown): DataCenterTableSummary {
  const record = requireRecord(payload, 'table');
  return {
    id: requiredString(record, 'id'),
    name: requiredString(record, 'name'),
    kind: requiredEnum(record, 'kind', TABLE_KINDS),
    rowCount: readRequiredNonNegativeInt64String(record, 'rowCount', 'Data center table.rowCount is required.'),
    columnCount: requiredCount(record, 'columnCount'),
    owner: optionalString(record, 'owner') ?? '',
    updatedAt: optionalString(record, 'updatedAt') ?? '',
  };
}

function normalizeExport(payload: unknown): DataCenterExportSummary {
  const record = requireRecord(payload, 'export');
  return {
    id: requiredString(record, 'id'),
    datasetName: requiredString(record, 'datasetName'),
    status: requiredEnum(record, 'status', EXPORT_STATUSES),
    rowCount: readRequiredNonNegativeInt64String(record, 'rowCount', 'Data center export.rowCount is required.'),
    requestedBy: optionalString(record, 'requestedBy') ?? '',
    expiresAt: optionalString(record, 'expiresAt'),
  };
}

function normalizeAudit(payload: unknown): DataCenterAuditSummary {
  const record = requireRecord(payload, 'audit');
  return {
    id: requiredString(record, 'id'),
    actor: optionalString(record, 'actor') ?? '',
    action: requiredEnum(record, 'action', AUDIT_ACTIONS),
    object: optionalString(record, 'object') ?? '',
    rowCount: readRequiredNonNegativeInt64String(record, 'rowCount', 'Data center audit.rowCount is required.'),
    result: requiredEnum(record, 'result', AUDIT_RESULTS),
    at: optionalString(record, 'at') ?? '',
  };
}

function requireItems(result: unknown, entity: string): unknown[] {
  return readRequiredApiItems(result, `Data center ${entity} response is missing items.`, ['items']);
}

/**
 * Typed facade used by the Data Center pages. Each method validates the
 * generated SDK payload; a failure rejects with an error naming the offending
 * field so the page can show a retryable state instead of an empty list.
 */
export const DataCenterService = {
  async fetchOverview(): Promise<DataCenterOverviewSummary> {
    const result = await getCloudRouterBackendSdkClient().datacenter.overview.retrieve();
    return normalizeOverview(readApiData(result));
  },
  async listSources(): Promise<readonly DataCenterSourceSummary[]> {
    const result = await getCloudRouterBackendSdkClient().datacenter.dataSources.list();
    return requireItems(result, 'sources').map(normalizeSource);
  },
  async listTables(): Promise<readonly DataCenterTableSummary[]> {
    const result = await getCloudRouterBackendSdkClient().datacenter.dataCenterTables.list();
    return requireItems(result, 'tables').map(normalizeTable);
  },
  async listExports(): Promise<readonly DataCenterExportSummary[]> {
    const result = await getCloudRouterBackendSdkClient().datacenter.dataCenterExports.list();
    return requireItems(result, 'exports').map(normalizeExport);
  },
  async listAudits(): Promise<readonly DataCenterAuditSummary[]> {
    const result = await getCloudRouterBackendSdkClient().datacenter.dataCenterAudits.list();
    return requireItems(result, 'audits').map(normalizeAudit);
  },
};
