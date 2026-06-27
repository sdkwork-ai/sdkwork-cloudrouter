/** Admin monitor node item schema exposed by Claw Router. */
export interface AdminMonitorNodeItem {
  /** Cpu field on admin monitor node item. */
  cpu: number;
  /** Id field on admin monitor node item. */
  id: string;
  /** Ip field on admin monitor node item. */
  ip: string;
  /** Memory field on admin monitor node item. */
  memory: number;
  /** Name field on admin monitor node item. */
  name: string;
  /** Region field on admin monitor node item. */
  region: string;
  /** Status field on admin monitor node item. */
  status: 'online' | 'warning' | 'offline';
  /** Uptime field on admin monitor node item. */
  uptime: string;
}
