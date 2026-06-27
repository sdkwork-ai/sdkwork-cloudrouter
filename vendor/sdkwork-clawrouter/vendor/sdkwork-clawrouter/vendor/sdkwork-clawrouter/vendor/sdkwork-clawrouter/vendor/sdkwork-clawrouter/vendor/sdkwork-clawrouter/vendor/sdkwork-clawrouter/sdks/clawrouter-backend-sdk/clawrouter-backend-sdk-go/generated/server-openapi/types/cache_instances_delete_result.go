package types

// Cache instances delete result schema exposed by Claw Router.
type CacheInstancesDeleteResult struct {
	Code string `json:"code"`
	Data AdminCacheOperationResponse `json:"data"`
	Msg string `json:"msg"`
}
