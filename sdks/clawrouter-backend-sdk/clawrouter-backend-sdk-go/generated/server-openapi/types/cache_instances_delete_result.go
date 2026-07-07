package types

// Cache instances delete result schema exposed by Claw Router.
type CacheInstancesDeleteResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
