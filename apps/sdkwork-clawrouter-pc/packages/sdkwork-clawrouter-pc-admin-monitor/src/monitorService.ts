import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

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

export class MonitorService {
  static async fetchNodes(): Promise<SysNode[]> {
    const result = await getClawRouterBackendSdkClient().system.monitor.nodes.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch system nodes');
    return readRequiredApiItems(result, 'Failed to fetch system nodes')
      .map(normalizeNode);
  }

  static async fetchAlerts(): Promise<Alert[]> {
    const result = await getClawRouterBackendSdkClient().system.monitor.alerts.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch alerts');
    return readRequiredApiItems(result, 'Failed to fetch alerts')
      .map(normalizeAlert);
  }

  static async fetchPerformanceData(): Promise<PerformanceDatum[]> {
    const result = await getClawRouterBackendSdkClient().system.monitor.performance.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch performance data');
    return readRequiredApiItems(result, 'Failed to fetch performance data')
      .map(normalizePerformanceDatum);
  }
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
