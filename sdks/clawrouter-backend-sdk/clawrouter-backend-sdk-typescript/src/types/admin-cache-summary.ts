/** Admin cache summary schema exposed by Claw Router. */
export interface AdminCacheSummary {
  /** Cache deletes field on admin cache summary. */
  cacheDeletes: string;
  /** Cache errors field on admin cache summary. */
  cacheErrors: string;
  /** Cache hits field on admin cache summary. */
  cacheHits: string;
  /** Cache inspections field on admin cache summary. */
  cacheInspections: string;
  /** Cache misses field on admin cache summary. */
  cacheMisses: string;
  /** Cache refreshes field on admin cache summary. */
  cacheRefreshes: string;
  /** Cache writes field on admin cache summary. */
  cacheWrites: string;
  /** Expired entries field on admin cache summary. */
  expiredEntries: string;
  /** Runtime target field on admin cache summary. */
  runtimeTarget: 'desktop_packaged' | 'service';
  /** Total entries field on admin cache summary. */
  totalEntries: string;
  /** Total instances field on admin cache summary. */
  totalInstances: string;
  /** Total namespaces field on admin cache summary. */
  totalNamespaces: string;
}
