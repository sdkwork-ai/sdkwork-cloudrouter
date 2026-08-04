package types

// Cache refresh create result schema exposed by Cloud Router.
type CacheRefreshCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
