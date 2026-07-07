package types

// Cache namespaces refresh create result schema exposed by Claw Router.
type CacheNamespacesRefreshCreateResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
