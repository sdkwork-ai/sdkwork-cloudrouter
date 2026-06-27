package types

// Cache namespaces keys list result schema exposed by Claw Router.
type CacheNamespacesKeysListResult struct {
	Code string `json:"code"`
	Data AdminCacheKeyListResponse `json:"data"`
	Msg string `json:"msg"`
}
