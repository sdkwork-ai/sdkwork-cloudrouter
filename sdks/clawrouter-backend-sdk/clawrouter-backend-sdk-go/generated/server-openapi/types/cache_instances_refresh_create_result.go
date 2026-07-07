package types

// Cache instances refresh create result schema exposed by Claw Router.
type CacheInstancesRefreshCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
