/** Admin cache key item schema exposed by Claw Router. */
export interface AdminCacheKeyItem {
  /** Expires in seconds field on admin cache key item. */
  expiresInSeconds?: string | null;
  /** Instance name field on admin cache key item. */
  instanceName: string;
  /** Key field on admin cache key item. */
  key: string;
  /** Namespace field on admin cache key item. */
  namespace: string;
  /** Status field on admin cache key item. */
  status: 'active' | 'expired';
}
