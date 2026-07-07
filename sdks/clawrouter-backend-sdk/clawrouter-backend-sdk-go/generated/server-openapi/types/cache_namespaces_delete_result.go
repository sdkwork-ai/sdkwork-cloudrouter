package types

// Cache namespaces delete result schema exposed by Claw Router.
type CacheNamespacesDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
