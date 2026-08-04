package types

// Cache overview retrieve result schema exposed by Cloud Router.
type CacheOverviewRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
