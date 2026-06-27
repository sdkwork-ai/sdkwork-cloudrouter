package types

// Cache namespaces delete result schema exposed by Claw Router.
type CacheNamespacesDeleteResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
