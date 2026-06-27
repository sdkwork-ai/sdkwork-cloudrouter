/** Admin cache instance schema exposed by Claw Router. */
export interface AdminCacheInstance {
  /** Cache deletes field on admin cache instance. */
  cacheDeletes: string;
  /** Cache errors field on admin cache instance. */
  cacheErrors: string;
  /** Cache hits field on admin cache instance. */
  cacheHits: string;
  /** Cache inspections field on admin cache instance. */
  cacheInspections: string;
  /** Cache misses field on admin cache instance. */
  cacheMisses: string;
  /** Cache refreshes field on admin cache instance. */
  cacheRefreshes: string;
  /** Cache writes field on admin cache instance. */
  cacheWrites: string;
  /** Connection profile name field on admin cache instance. */
  connectionProfileName?: string | null;
  /** Default ttl seconds field on admin cache instance. */
  defaultTtlSeconds: string;
  /** Entry count field on admin cache instance. */
  entryCount: string;
  /** Expired entry count field on admin cache instance. */
  expiredEntryCount: string;
  /** Key prefix field on admin cache instance. */
  keyPrefix: string;
  /** Max entries field on admin cache instance. */
  maxEntries?: string | null;
  /** Name field on admin cache instance. */
  name: string;
  /** Provider kind field on admin cache instance. */
  providerKind: 'local_cache' | 'redis_cache';
  /** Purpose field on admin cache instance. */
  purpose: string;
  /** Status field on admin cache instance. */
  status: string;
  /** Supports delete field on admin cache instance. */
  supportsDelete: boolean;
  /** Supports inspect field on admin cache instance. */
  supportsInspect: boolean;
  /** Supports refresh field on admin cache instance. */
  supportsRefresh: boolean;
}
