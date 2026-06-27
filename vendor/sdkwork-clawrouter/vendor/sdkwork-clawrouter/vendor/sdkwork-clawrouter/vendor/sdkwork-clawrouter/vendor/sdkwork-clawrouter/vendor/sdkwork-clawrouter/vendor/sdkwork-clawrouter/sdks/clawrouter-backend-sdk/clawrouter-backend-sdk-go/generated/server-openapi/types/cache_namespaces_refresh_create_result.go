package types

// Cache namespaces refresh create result schema exposed by Claw Router.
type CacheNamespacesRefreshCreateResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
