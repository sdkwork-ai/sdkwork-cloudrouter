package types

// Cache instances refresh create result schema exposed by Claw Router.
type CacheInstancesRefreshCreateResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
