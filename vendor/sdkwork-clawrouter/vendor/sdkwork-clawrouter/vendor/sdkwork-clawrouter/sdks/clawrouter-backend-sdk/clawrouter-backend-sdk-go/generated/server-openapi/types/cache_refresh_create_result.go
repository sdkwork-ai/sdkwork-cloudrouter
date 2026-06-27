package types

// Cache refresh create result schema exposed by Claw Router.
type CacheRefreshCreateResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
