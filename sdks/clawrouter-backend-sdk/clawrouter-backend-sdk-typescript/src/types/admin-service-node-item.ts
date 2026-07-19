/** AdminServiceNodeItem contract. */
export interface AdminServiceNodeItem {
  /** domain field on AdminServiceNodeItem. */
  domain: string;
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
