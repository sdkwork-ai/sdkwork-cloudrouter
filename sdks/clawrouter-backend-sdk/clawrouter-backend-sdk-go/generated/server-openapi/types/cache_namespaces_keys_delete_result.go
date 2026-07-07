package types

// Cache namespaces keys delete result schema exposed by Claw Router.
type CacheNamespacesKeysDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
