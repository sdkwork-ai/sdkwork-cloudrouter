package types

// Cache overview retrieve result schema exposed by Claw Router.
type CacheOverviewRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
