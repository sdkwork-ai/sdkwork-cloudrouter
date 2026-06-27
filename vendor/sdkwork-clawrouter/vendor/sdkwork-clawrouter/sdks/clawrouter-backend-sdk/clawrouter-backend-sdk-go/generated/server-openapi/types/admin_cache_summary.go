package types

// Admin cache summary schema exposed by Claw Router.
type AdminCacheSummary struct {
	CacheDeletes string `json:"cacheDeletes"`
	CacheErrors string `json:"cacheErrors"`
	CacheHits string `json:"cacheHits"`
	CacheInspections string `json:"cacheInspections"`
	CacheMisses string `json:"cacheMisses"`
	CacheRefreshes string `json:"cacheRefreshes"`
	CacheWrites string `json:"cacheWrites"`
	ExpiredEntries string `json:"expiredEntries"`
	RuntimeTarget string `json:"runtimeTarget"`
	TotalEntries string `json:"totalEntries"`
	TotalInstances string `json:"totalInstances"`
	TotalNamespaces string `json:"totalNamespaces"`
}
