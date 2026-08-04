package types

// Shops current readiness retrieve result schema exposed by Cloud Router.
type ShopsCurrentReadinessRetrieveResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
