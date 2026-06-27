package types

// Admin cache instance schema exposed by Claw Router.
type AdminCacheInstance struct {
	CacheDeletes string `json:"cacheDeletes"`
	CacheErrors string `json:"cacheErrors"`
	CacheHits string `json:"cacheHits"`
	CacheInspections string `json:"cacheInspections"`
	CacheMisses string `json:"cacheMisses"`
	CacheRefreshes string `json:"cacheRefreshes"`
	CacheWrites string `json:"cacheWrites"`
	ConnectionProfileName string `json:"connectionProfileName"`
	DefaultTtlSeconds string `json:"defaultTtlSeconds"`
	EntryCount string `json:"entryCount"`
	ExpiredEntryCount string `json:"expiredEntryCount"`
	KeyPrefix string `json:"keyPrefix"`
	MaxEntries string `json:"maxEntries"`
	Name string `json:"name"`
	ProviderKind string `json:"providerKind"`
	Purpose string `json:"purpose"`
	Status string `json:"status"`
	SupportsDelete bool `json:"supportsDelete"`
	SupportsInspect bool `json:"supportsInspect"`
	SupportsRefresh bool `json:"supportsRefresh"`
}
