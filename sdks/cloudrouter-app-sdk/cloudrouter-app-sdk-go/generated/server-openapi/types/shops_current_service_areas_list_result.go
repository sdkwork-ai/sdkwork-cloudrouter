package types

// Shops current service areas list result schema exposed by Cloud Router.
type ShopsCurrentServiceAreasListResult struct {
	Code int `json:"code"`
	Data interface{} `json:"data"`
	TraceId string `json:"traceId"`
}
