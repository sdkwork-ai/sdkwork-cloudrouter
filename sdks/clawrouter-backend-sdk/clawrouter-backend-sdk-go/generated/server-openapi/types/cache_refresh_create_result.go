package types

// Cache refresh create result schema exposed by Claw Router.
type CacheRefreshCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
