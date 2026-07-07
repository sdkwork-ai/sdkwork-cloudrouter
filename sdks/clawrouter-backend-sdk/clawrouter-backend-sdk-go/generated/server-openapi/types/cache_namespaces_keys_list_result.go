package types

// Cache namespaces keys list result schema exposed by Claw Router.
type CacheNamespacesKeysListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
