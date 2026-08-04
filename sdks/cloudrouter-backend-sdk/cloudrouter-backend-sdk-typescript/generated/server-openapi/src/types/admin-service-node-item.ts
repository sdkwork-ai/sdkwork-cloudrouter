/** AdminServiceNodeItem contract. */
export interface AdminServiceNodeItem {
  /** Primary public HTTP(S) API base URL. */
  baseUrl: string;
  /** Deployment topology used to expose this API ingress. */
  deploymentProfile: 'standalone' | 'cloud';
  /** Compatibility mirror of the first configured domain. */
  domain: string;
  /** Normalized public domain aliases served by this node. */
  domains: string[];
  /** healthStatus field on AdminServiceNodeItem. */
  healthStatus: 'online' | 'warning' | 'offline' | 'unknown';
  /** id field on AdminServiceNodeItem. */
  id: string;
  /** ip field on AdminServiceNodeItem. */
  ip: string;
  /** name field on AdminServiceNodeItem. */
  name: string;
  /** remark field on AdminServiceNodeItem. */
  remark: string;
  /** status field on AdminServiceNodeItem. */
  status: 'enabled' | 'disabled';
  /** updatedAt field on AdminServiceNodeItem. */
  updatedAt: string;
}
