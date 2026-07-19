import {
  ensureSdkworkApiSuccess,
  isRecord,
  optionalBoundedPositiveInteger as optionalQueryPageSize,
  optionalPositiveInteger as optionalQueryPage,
  optionalText as optionalQueryText,
  readApiRecord,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawrouter-pc-admin-core/sdk';

export interface SysNode {
  id: string;
  name: string;
  region: string;
  status: 'online' | 'warning' | 'offline';
  cpu: number;
  memory: number;
  uptime: string;
  ip: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  time: string;
  status: 'active' | 'resolved';
  source: string;
}

export interface PerformanceDatum {
  time: string;
  cpu: number;
  memory: number;
  network: number;
}

export type MonitorListFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  searchQuery?: string;
};

export type MonitorListPage<T> = {
  items: T[];
  total: number;
};

export const MONITOR_OVERVIEW_SAMPLE_PAGE_SIZE = 200;

const MAX_MONITOR_LIST_PAGE_SIZE = 200;
const MAX_MONITOR_LIST_QUERY_TEXT_LENGTH = 128;

export class MonitorService {
  static async fetchNodes(filters: MonitorListFilters = {}): Promise<MonitorListPage<SysNode>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.monitor.nodes.list(toOffsetListSdkParams(filters)),
      normalizeNode,
      'Failed to fetch system nodes',
    );
  }

  static async fetchAlerts(filters: MonitorListFilters = {}): Promise<MonitorListPage<Alert>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.monitor.alerts.list(toOffsetListSdkParams(filters)),
      normalizeAlert,
      'Failed to fetch alerts',
    );
  }

  static async fetchPerformanceData(filters: MonitorListFilters = {}): Promise<MonitorListPage<PerformanceDatum>> {
    return fetchOffsetListPage(
      () => getClawRouterBackendSdkClient().system.monitor.performance.list(toOffsetListSdkParams(filters)),
      normalizePerformanceDatum,
      'Failed to fetch performance data',
    );
  }
}

async function fetchOffsetListPage<T>(
  loadPage: () => Promise<unknown>,
  mapItem: (value: unknown) => T,
  errorMessage: string,
): Promise<MonitorListPage<T>> {
  const result = await loadPage();
  ensureSdkworkApiSuccess(result, errorMessage);
  const data = readApiRecord(result);
  return {
    items: readRequiredApiItems(result, errorMessage).map(mapItem),
    total: readListPageTotal(data, `${errorMessage}: total is required`),
  };
}

function toOffsetListSdkParams(filters: MonitorListFilters = {}): {
  page?: number;
  pageSize?: number;
  q?: string;
} | undefined {
  const page = optionalQueryPage(filters.page, 'page');
  const pageSize = optionalQueryPageSize(filters.pageSize, 'pageSize', MAX_MONITOR_LIST_PAGE_SIZE);
  const q = optionalQueryText(filters.q ?? filters.searchQuery, 'q', MAX_MONITOR_LIST_QUERY_TEXT_LENGTH);
  const params = {
    page,
    pageSize,
    q,
  };
  return Object.values(params).some((value) => value !== undefined) ? params : undefined;
}

function readListPageTotal(data: ApiRecord, message: string): number {
  if (data.total !== undefined && data.total !== null && data.total !== '') {
    return readRequiredNonNegativeNumber(data, 'total', message);
  }

  const pageInfo = data.pageInfo;
  if (isRecord(pageInfo)) {
    for (const key of ['totalItems', 'total_items'] as const) {
      const value = pageInfo[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
      throw new Error(`${message.replace(/ is required$/, '')} must be a non-negative number`);
    }
  }

  const items = data.items;
  if (Array.isArray(items)) {
    return items.length;
  }

  throw new Error(message);
}

function normalizeNode(value: unknown): SysNode {
  const item = readRequiredRecord(value, 'System node record is required');
  return {
    id: readRequiredString(item, 'id', 'System node id is required'),
    name: readRequiredString(item, 'name', 'System node name is required'),
    region: readRequiredString(item, 'region', 'System node region is required'),
    status: readNodeStatus(item),
    cpu: readRequiredNonNegativeNumber(item, 'cpu', 'System node cpu is required'),
    memory: readRequiredNonNegativeNumber(item, 'memory', 'System node memory is required'),
    uptime: readRequiredString(item, 'uptime', 'System node uptime is required'),
    ip: readRequiredString(item, 'ip', 'System node ip is required'),
  };
}

function normalizeAlert(value: unknown): Alert {
  const item = readRequiredRecord(value, 'Alert record is required');
  return {
    id: readRequiredString(item, 'id', 'Alert id is required'),
    severity: readAlertSeverity(item),
    title: readRequiredString(item, 'title', 'Alert title is required'),
    message: readRequiredString(item, 'message', 'Alert message is required'),
    time: readRequiredString(item, 'time', 'Alert time is required'),
    status: readAlertStatus(item),
    source: readRequiredString(item, 'source', 'Alert source is required'),
  };
}

function normalizePerformanceDatum(value: unknown): PerformanceDatum {
  const item = readRequiredRecord(value, 'Performance record is required');
  return {
    time: readRequiredString(item, 'time', 'Performance time is required'),
    cpu: readRequiredNonNegativeNumber(item, 'cpu', 'Performance cpu is required'),
    memory: readRequiredNonNegativeNumber(item, 'memory', 'Performance memory is required'),
    network: readRequiredNonNegativeNumber(item, 'network', 'Performance network is required'),
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readNodeStatus(item: ApiRecord): 'online' | 'warning' | 'offline' {
  const status = readString(item, 'status');
  if (status === 'online' || status === 'warning' || status === 'offline') {
    return status;
  }
  throw new Error(status ? `Unsupported system node status: ${status}` : 'System node status is required');
}

function readAlertSeverity(item: ApiRecord): 'critical' | 'warning' | 'info' {
  const severity = readString(item, 'severity');
  if (severity === 'critical' || severity === 'warning' || severity === 'info') {
    return severity;
  }
  throw new Error(severity ? `Unsupported alert severity: ${severity}` : 'Alert severity is required');
}

function readAlertStatus(item: ApiRecord): Alert['status'] {
  const status = readString(item, 'status');
  if (status === 'active' || status === 'resolved') {
    return status;
  }
  throw new Error(status ? `Unsupported alert status: ${status}` : 'Alert status is required');
}
